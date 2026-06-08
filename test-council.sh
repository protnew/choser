#!/bin/sh
wget -qO- --post-data='{"topic":"Сравни чай и кофе по цене, вкусу, бодрости. Какой лучше?","question":"Какой напиток лучший?","mode":"sequential"}' --header="Content-Type: application/json" "http://localhost:3000/v1/api/council/decide-stream" 2>&1
