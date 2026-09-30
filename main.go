package main

import (
	"errors"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

const defaultPort = "8804"

type siteConfig struct {
	Port           string
	ShowSaleNotice bool
}

func main() {
	config, err := loadConfig("config/.env")
	if err != nil {
		log.Fatal(err)
	}
	// Uppr mounts data/ even though this public-only site has no database writes.
	if err := os.MkdirAll("data", 0700); err != nil {
		log.Fatal(err)
	}
	log.Printf("Gypsy Coffee House listening on 0.0.0.0:%s", config.Port)
	log.Fatal(http.ListenAndServe("0.0.0.0:"+config.Port, siteHandler(config.ShowSaleNotice)))
}

func loadConfig(path string) (siteConfig, error) {
	config := siteConfig{Port: defaultPort, ShowSaleNotice: true}
	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		return config, err
	}
	data, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		data = []byte("PORT=" + defaultPort + "\nSHOW_SALE_NOTICE=on\n")
		if err := os.WriteFile(path, data, 0600); err != nil {
			return config, err
		}
	} else if err != nil {
		return config, err
	}
	for _, line := range strings.Split(string(data), "\n") {
		key, value, found := strings.Cut(strings.TrimSpace(line), "=")
		if !found {
			continue
		}
		value = strings.Trim(strings.TrimSpace(value), `"'`)
		switch strings.TrimSpace(key) {
		case "PORT":
			if value != "" {
				config.Port = value
			}
		case "SHOW_SALE_NOTICE":
			switch strings.ToLower(value) {
			case "", "on", "true", "1", "yes":
				config.ShowSaleNotice = true
			case "off", "false", "0", "no":
				config.ShowSaleNotice = false
			default:
				return config, fmt.Errorf("invalid SHOW_SALE_NOTICE %q in %s: use on or off", value, path)
			}
		}
	}
	n, err := strconv.Atoi(config.Port)
	if err != nil || n < 1 || n > 65535 {
		return config, fmt.Errorf("invalid PORT %q in %s", config.Port, path)
	}
	return config, nil
}

func siteHandler(showSaleNotice bool) http.Handler {
	home := template.Must(template.ParseFiles("templates/home.html"))
	mux := http.NewServeMux()
	assets := http.StripPrefix("/public/", http.FileServer(http.Dir("public")))
	mux.Handle("GET /public/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch strings.ToLower(filepath.Ext(r.URL.Path)) {
		case ".mp4", ".webp", ".png", ".jpg", ".svg":
			w.Header().Set("Cache-Control", "public, max-age=86400")
		default:
			w.Header().Set("Cache-Control", "public, max-age=3600")
		}
		assets.ServeHTTP(w, r)
	}))
	mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		if err := home.Execute(w, struct{ ShowSaleNotice bool }{showSaleNotice}); err != nil {
			log.Print(err)
		}
	})
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("X-Frame-Options", "DENY")
		mux.ServeHTTP(w, r)
	})
}
