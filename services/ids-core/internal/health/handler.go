package health

import "net/http"

func Handler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"service":"ids-core","status":"ok"}`))
}
