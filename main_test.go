package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestSiteAndRemovedAdmin(t *testing.T) {
	handler := siteHandler(true)
	for _, path := range []string{"/", "/public/style.css", "/public/site.js", "/public/selected/hero-pingpong.mp4"} {
		response := httptest.NewRecorder()
		handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, path, nil))
		if response.Code != http.StatusOK {
			t.Errorf("GET %s: got %d", path, response.Code)
		}
	}
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/admin", nil))
	if response.Code != http.StatusNotFound {
		t.Fatalf("admin should be gone: got %d", response.Code)
	}
	response = httptest.NewRecorder()
	handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/", nil))
	if !strings.Contains(response.Body.String(), `id="visit"`) || !strings.Contains(response.Body.String(), `id="music"`) {
		t.Fatal("public scenes are missing")
	}
	if !strings.Contains(response.Body.String(), `id="saleNotice"`) || !strings.Contains(response.Body.String(), `englandsoftware_logo.svg`) {
		t.Fatal("enabled sale notice is missing")
	}
	response = httptest.NewRecorder()
	siteHandler(false).ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/", nil))
	if strings.Contains(response.Body.String(), `id="saleNotice"`) || strings.Contains(response.Body.String(), `id="saleNoticeBubble"`) || strings.Contains(response.Body.String(), `<main inert>`) {
		t.Fatal("disabled sale notice is still present")
	}
	videoRequest := httptest.NewRequest(http.MethodGet, "/public/selected/hero-pingpong.mp4", nil)
	videoRequest.Header.Set("Range", "bytes=0-1023")
	response = httptest.NewRecorder()
	handler.ServeHTTP(response, videoRequest)
	if response.Code != http.StatusPartialContent || response.Header().Get("Cache-Control") != "public, max-age=86400" {
		t.Fatal("video should support range requests and browser caching")
	}
}

func TestLoadConfig(t *testing.T) {
	path := filepath.Join(t.TempDir(), "config", ".env")
	config, err := loadConfig(path)
	if err != nil || config.Port != defaultPort || !config.ShowSaleNotice {
		t.Fatalf("new config: config=%+v err=%v", config, err)
	}
	if err := os.WriteFile(path, []byte("PORT=\nSHOW_SALE_NOTICE=\n"), 0600); err != nil {
		t.Fatal(err)
	}
	config, err = loadConfig(path)
	if err != nil || config.Port != defaultPort || !config.ShowSaleNotice {
		t.Fatalf("blank Uppr config: config=%+v err=%v", config, err)
	}
	if err := os.WriteFile(path, []byte("PORT=9904\nSHOW_SALE_NOTICE=off\n"), 0600); err != nil {
		t.Fatal(err)
	}
	config, err = loadConfig(path)
	if err != nil || config.Port != "9904" || config.ShowSaleNotice {
		t.Fatalf("configured values: config=%+v err=%v", config, err)
	}
}
