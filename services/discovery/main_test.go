package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestReplayUsesExternalVersion(t *testing.T) {
	es := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("version") != "3" || r.URL.Query().Get("version_type") != "external_gte" {
			t.Error("missing external version guard")
		}
		w.WriteHeader(409)
	}))
	defer es.Close()
	s := &server{client: es.Client(), elastic: es.URL}
	data, _ := json.Marshal(event{SchemaVersion: 1, AggregateID: "one", Version: 3, Offer: offer{ID: "one", Version: 3, Status: "PUBLISHED"}})
	if err := s.project(context.Background(), data); err != nil {
		t.Fatal(err)
	}
}
func TestPrivateOrUnknownEventRejected(t *testing.T) {
	s := &server{}
	for _, raw := range []string{`{"schemaVersion":2}`, `{"schemaVersion":1,"aggregateId":"x","version":1,"offer":{"id":"x","version":1,"status":"DRAFT"}}`} {
		if s.project(context.Background(), []byte(raw)) == nil {
			t.Fatal("invalid event accepted")
		}
	}
}
func TestFallbackAndQueryEscaping(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/offers-v1/_search" {
			w.WriteHeader(503)
			return
		}
		if r.URL.Query().Get("q") != "cup & saucer" {
			t.Error("query changed")
		}
		_, _ = w.Write([]byte(`[]`))
	}))
	defer upstream.Close()
	s := &server{client: upstream.Client(), commerce: upstream.URL, elastic: upstream.URL}
	out := httptest.NewRecorder()
	s.search(out, httptest.NewRequest("GET", "/api/search?q=cup+%26+saucer", nil))
	if out.Code != 200 {
		t.Fatal(out.Code)
	}
	var body struct{ Source string }
	_ = json.Unmarshal(out.Body.Bytes(), &body)
	if body.Source != "authoritative-fallback" {
		t.Fatal(body.Source)
	}
}
