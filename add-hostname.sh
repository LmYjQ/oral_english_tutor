#!/usr/bin/env bash
# 把 oral.liu1quan.online 挂到已有的 hometutor 隧道上。
# 需要一个 Cloudflare API Token，权限：
#   - Account > Cloudflare Tunnel > Edit
#   - Zone > DNS > Edit      (zone: liu1quan.online)
#
# 用法：
#   export CLOUDFLARE_API_TOKEN=xxxx
#   ./add-hostname.sh
set -euo pipefail

TOKEN="${CLOUDFLARE_API_TOKEN:-}"
ZONE="${ZONE:-liu1quan.online}"
SUBDOMAIN="${SUBDOMAIN:-oral}"
SERVICE="${SERVICE:-http://oral-site:80}"
ACCOUNT="${ACCOUNT:-a6fa1b663a295fb3ff40b62cb0d72dcf}"
TUNNEL="${TUNNEL:-cbbfc27c-240a-4104-9e6c-b1ab93e2edf1}"

[ -n "$TOKEN" ] || { echo "缺少 CLOUDFLARE_API_TOKEN" >&2; exit 1; }

API="https://api.cloudflare.com/client/v4"
AUTH=(-H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json")
FQDN="${SUBDOMAIN}.${ZONE}"

echo "==> 1/3 获取 zone id"
ZONE_ID=$(curl -sf "${AUTH[@]}" "$API/zones?name=$ZONE" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d["result"][0]["id"])')
echo "    zone_id=$ZONE_ID  fqdn=$FQDN"

echo "==> 2/3 写入隧道 ingress 配置"
CONFIG=$(curl -sf "${AUTH[@]}" "$API/accounts/$ACCOUNT/cfd_tunnel/$TUNNEL/configurations" \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print(json.dumps(d["result"]["config"]))')

NEW=$(python3 - "$CONFIG" "$FQDN" "$SERVICE" <<'PY'
import json, sys
cfg, fqdn, service = json.loads(sys.argv[1]), sys.argv[2], sys.argv[3]
ing = cfg.setdefault("ingress", [])
# 移除同名旧规则
ing = [r for r in ing if r.get("hostname") != fqdn]
# 插到 catch-all 之前
catch = [r for r in ing if "hostname" not in r]
named = [r for r in ing if "hostname" in r]
named.append({"hostname": fqdn, "service": service})
cfg["ingress"] = named + catch
print(json.dumps(cfg))
PY
)

curl -sf -X PUT "${AUTH[@]}" \
  "$API/accounts/$ACCOUNT/cfd_tunnel/$TUNNEL/configurations" \
  --data "{\"config\": $NEW}" >/dev/null
echo "    ingress 已更新"

echo "==> 3/3 创建 DNS CNAME"
EXIST=$(curl -sf "${AUTH[@]}" "$API/zones/$ZONE_ID/dns_records?name=$FQDN" \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);r=d["result"];print(r[0]["id"] if r else "")')

if [ -n "$EXIST" ]; then
  echo "    DNS 记录已存在，更新中"
  curl -sf -X PUT "${AUTH[@]}" "$API/zones/$ZONE_ID/dns_records/$EXIST" \
    --data "{\"type\":\"CNAME\",\"name\":\"$FQDN\",\"content\":\"$TUNNEL.cfargotunnel.com\",\"proxied\":true,\"ttl\":1}" >/dev/null
else
  curl -sf -X POST "${AUTH[@]}" "$API/zones/$ZONE_ID/dns_records" \
    --data "{\"type\":\"CNAME\",\"name\":\"$FQDN\",\"content\":\"$TUNNEL.cfargotunnel.com\",\"proxied\":true,\"ttl\":1}" >/dev/null
  echo "    DNS 记录已创建"
fi

echo
echo "✅ 完成。等待几秒后访问：https://$FQDN/"
echo "   验证：curl -sI https://$FQDN/ | head -1"
