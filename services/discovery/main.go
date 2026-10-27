package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"sync/atomic"
	"syscall"
	"time"

	"github.com/segmentio/kafka-go"
)

type offer struct {
	ID          string `json:"id"`
	ProductID   string `json:"productId"`
	Title       string `json:"title"`
	Category    string `json:"category"`
	Description string `json:"description"`
	SellerID    string `json:"sellerId"`
	SellerName  string `json:"sellerName"`
	PricePaise  int64  `json:"pricePaise"`
	Available   int    `json:"available"`
	Status      string `json:"status"`
	Version     int64  `json:"version"`
}
type event struct {
	SchemaVersion int    `json:"schemaVersion"`
	AggregateID   string `json:"aggregateId"`
	Version       int64  `json:"version"`
	Offer         offer  `json:"offer"`
}
type server struct {
	client            *http.Client
	commerce, elastic string
	indexed           atomic.Int64
	failures          atomic.Int64
}

func env(name, fallback string) string {
	if v := os.Getenv(name); v != "" {
		return v
	}
	return fallback
}
func (s *server) request(ctx context.Context, method, target string, body []byte) ([]byte, int, error) {
	req, err := http.NewRequestWithContext(ctx, method, target, bytes.NewReader(body))
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Content-Type", "application/json")
	res, err := s.client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer res.Body.Close()
	data, err := io.ReadAll(io.LimitReader(res.Body, 2<<20))
	return data, res.StatusCode, err
}
func searchQuery(q string) []byte {
	query := any(map[string]any{"match_all": map[string]any{}})
	if q != "" {
		query = map[string]any{"multi_match": map[string]any{"query": q, "fields": []string{"title^3", "category^2", "description"}, "fuzziness": "AUTO"}}
	}
	b, _ := json.Marshal(map[string]any{"size": 100, "query": query, "sort": []any{"_score", map[string]any{"id.keyword": "asc"}}})
	return b
}
func (s *server) search(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	if len(q) > 100 {
		http.Error(w, "Search too long", 400)
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	data, status, err := s.request(ctx, "POST", s.elastic+"/offers-v1/_search", searchQuery(q))
	var result struct {
		Hits struct {
			Hits []struct {
				Source offer `json:"_source"`
			} `json:"hits"`
		} `json:"hits"`
	}
	source := "elasticsearch"
	offers := []offer{}
	if err == nil && status == 200 && json.Unmarshal(data, &result) == nil {
		for _, hit := range result.Hits.Hits {
			if hit.Source.Status == "PUBLISHED" {
				offers = append(offers, hit.Source)
			}
		}
	} else {
		source = "authoritative-fallback"
		data, status, err = s.request(ctx, "GET", s.commerce+"/api/catalog?q="+url.QueryEscape(q), nil)
		if err != nil || status != 200 || json.Unmarshal(data, &offers) != nil {
			http.Error(w, "Discovery temporarily unavailable", 503)
			return
		}
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	_ = json.NewEncoder(w).Encode(map[string]any{"items": offers, "source": source, "limit": 100})
}
func (s *server) project(ctx context.Context, data []byte) error {
	var e event
	if err := json.Unmarshal(data, &e); err != nil {
		return fmt.Errorf("decode event: %w", err)
	}
	if e.SchemaVersion != 1 || e.AggregateID == "" || e.AggregateID != e.Offer.ID || e.Version < 1 || e.Version != e.Offer.Version || e.Offer.Status != "PUBLISHED" {
		return fmt.Errorf("unsupported or invalid public snapshot")
	}
	b, err := json.Marshal(e.Offer)
	if err != nil {
		return err
	}
	_, status, err := s.request(ctx, "PUT", s.elastic+"/offers-v1/_doc/"+url.PathEscape(e.AggregateID)+"?version="+strconv.FormatInt(e.Version, 10)+"&version_type=external_gte", b)
	if err != nil {
		return fmt.Errorf("index: %w", err)
	}
	// An older version is safe to acknowledge; newer authoritative state already won.
	if status == 409 || status == 200 || status == 201 {
		s.indexed.Add(1)
		return nil
	}
	return fmt.Errorf("index returned %d", status)
}
func (s *server) consume(ctx context.Context, broker string) {
	reader := kafka.NewReader(kafka.ReaderConfig{Brokers: []string{broker}, GroupID: "discovery-v1", Topic: "catalog.v1", MinBytes: 1, MaxBytes: 1 << 20, MaxWait: time.Second, StartOffset: kafka.FirstOffset, WatchPartitionChanges: true, PartitionWatchInterval: 3 * time.Second})
	defer reader.Close()
	for ctx.Err() == nil {
		msg, err := reader.FetchMessage(ctx)
		if err != nil {
			if ctx.Err() == nil {
				slog.Warn("Kafka fetch failed")
				select {
				case <-ctx.Done():
					return
				case <-time.After(time.Second):
				}
			}
			continue
		}
		for ctx.Err() == nil {
			if err = s.project(ctx, msg.Value); err == nil {
				break
			}
			s.failures.Add(1)
			slog.Warn("Projection blocked; event retained", "partition", msg.Partition, "offset", msg.Offset, "error", err.Error())
			select {
			case <-ctx.Done():
				return
			case <-time.After(3 * time.Second):
			}
		}
		if ctx.Err() != nil {
			return
		}
		if err = reader.CommitMessages(ctx, msg); err != nil {
			slog.Warn("Commit failed; replay is safe")
		}
	}
}
func main() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	s := &server{client: &http.Client{Timeout: 3 * time.Second}, commerce: env("COMMERCE_URL", "http://localhost:8080"), elastic: env("ELASTIC_URL", "http://localhost:9200")}
	go s.consume(ctx, env("KAFKA_BROKER", "localhost:9092"))
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/search", s.search)
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"status": "up", "indexed": s.indexed.Load(), "projectionFailures": s.failures.Load()})
	})
	httpServer := &http.Server{Addr: ":8081", Handler: mux, ReadHeaderTimeout: 3 * time.Second, ReadTimeout: 5 * time.Second, WriteTimeout: 8 * time.Second, IdleTimeout: 30 * time.Second, MaxHeaderBytes: 16 << 10}
	go func() {
		<-ctx.Done()
		shutdown, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = httpServer.Shutdown(shutdown)
	}()
	slog.Info("Discovery listening", "port", 8081)
	if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		slog.Error("Server failed", "error", err)
		os.Exit(1)
	}
}
