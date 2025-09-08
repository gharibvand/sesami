set -euo pipefail

request() {
  data=('{"id":"1","start":"2020-10-10 20:20","end":"2020-10-10 20:30","createdAt":"2020-09-02 14:23:12","updatedAt":"2020-09-28 14:23:12","orgId":"orgC"}'
        '{"id":"2","start":"2020-10-10 20:25","end":"2020-10-10 20:35","createdAt":"2020-09-02 14:23:12","updatedAt":"2020-09-28 14:23:12","orgId":"orgC"}'
        '{"id":"3","start":"2020-10-11 10:00","end":"2020-10-11 11:30","createdAt":"2020-10-01 11:23:12","updatedAt":"2020-09-28 14:23:12","orgId":"orgC"}'
        '{"id":"1","start":"2020-10-17 14:40","end":"2020-10-17 15:30","createdAt":"2020-03-02 19:23:12","updatedAt":"2020-09-28 14:24:12","orgId":"orgC"}')
  random_data=${data[$RANDOM % ${#data[@]}]}
  code=$(curl -sS -o /dev/null -w "%{http_code}" -H "Content-Type: application/json" \
    -X POST http://localhost:3000/api/appointments -d "$random_data")
  echo "POST -> $code :: $random_data"
}

export -f request
seq 1 ${1:-100} | xargs -n1 -P10 bash -c 'request'
