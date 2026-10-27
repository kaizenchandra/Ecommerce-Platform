FROM golang:1.24-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go test ./... && go vet ./... && CGO_ENABLED=0 go build -o /discovery .
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /discovery /discovery
ENTRYPOINT ["/discovery"]
