.PHONY: run build test

run:
	go run .

build:
	mkdir -p bin
	go build -o bin/gypsycoffee .

test:
	go test ./...
