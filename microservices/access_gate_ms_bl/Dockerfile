FROM golang:1.24-alpine AS base
WORKDIR /app

RUN apk add --no-cache git

COPY go.mod go.sum ./
RUN go mod download

COPY . .

FROM base AS dev

RUN go install github.com/air-verse/air@v1.52.3

ENV ACCESS_GATE_MS_INTERNAL_PORT=3000
ENV ACCESS_GATE_MS_GRPC_PORT=50054

CMD ["air"]

FROM base AS build

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -o access_gate ./cmd/access_gate

FROM alpine:latest AS prod

WORKDIR /app

RUN adduser -D appuser
USER appuser

COPY --from=build /app/access_gate .

ENV ACCESS_GATE_MS_INTERNAL_PORT=3000
ENV ACCESS_GATE_MS_GRPC_PORT=50054

EXPOSE 3000
EXPOSE 50054

CMD ["./access_gate"]
