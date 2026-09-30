FROM golang:1.24-alpine AS build
WORKDIR /src
COPY go.mod ./
COPY main.go ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /gypsycoffee .

FROM scratch
WORKDIR /app
COPY --from=build /gypsycoffee ./gypsycoffee
COPY templates/ ./templates/
COPY public/ ./public/
EXPOSE 8804
CMD ["./gypsycoffee"]
