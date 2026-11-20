# oral.liu1quan.online — 自研素材口语课 · 静态站部署说明

## 架构

```
朋友(公网) ──HTTPS──> Cloudflare 边缘 ──隧道──> cloudflared 容器 ──Docker内网──> oral-site (nginx)
                                                                  host: http://oral-site:80
```

- NAS **不需要公网 IP**，也不需要路由器端口映射 / UPnP
- cloudflared 主动向 Cloudflare 建立**出站**连接（QUIC/UDP 7844），流量从这条连接回传
- 现有隧道 `hometutor` 已在运行，`api.liu1quan.online` → `http://api:3000`，静态站复用同一条隧道

## 文件

| 文件 | 说明 |
|---|---|
| `site/index.html` | Unit 1 单元总览首页（课时卡 + 素材清单） |
| `site/styles.css` `site/app.js` | 首页样式与渲染逻辑 |
| `site/common/core.js` | L1–L4 共用内核：音频播放 / MediaRecorder 录音 / 提示条 / 进度导航 / 彩带（`window.OE`） |
| `site/l1/` `site/l2/` | 各课孩子端页面：`index.html` + `styles.css` + `lesson.js`（数据）+ `app.js`（本课的 `BUILDERS`） |
| `site/assets/unit1/<课>/` | 生成的图片 / 音频素材 + `index.json` 清单 |
| `tools/gen_assets.py` | 素材生成**通用引擎**（脚本本身不含素材内容） |
| `tools/specs/<课>.json` | 各课素材内容（图片 prompt / 台词 / 声线），改这里再重跑脚本 |
| `nginx.conf` | nginx 配置（gzip、安全头、`/healthz`、缓存头） |
| `docker-compose.yml` | `oral-site` 容器定义，挂到已有 Docker 网络 |
| `add-hostname.sh` | 一键把 `oral.liu1quan.online` 挂到隧道 + 建 DNS |
| `L1网页课方案-20261113.md` / `L2网页课方案-20261113.md` | 各课方案与验证记录 |

## 素材生成

素材内容全部写在 `tools/specs/<课>.json`，脚本是通用引擎：

```bash
python3 tools/gen_assets.py --list                          # 列出可用 spec
python3 tools/gen_assets.py --lesson L2 --only images       # MiniMax H3-Image
python3 tools/gen_assets.py --lesson L2 --only audio        # SiliconFlow CosyVoice2（anna / bella）
python3 tools/gen_assets.py --lesson L2 --only all --force  # 全部重生成
```

密钥从 `.env` 读取（**不要提交 .env**，仓库里的 `.gitignore` 已排除）。需要的变量：

| 变量 | 用途 |
|---|---|
| `MINIMAX_API` | 图片生成（MiniMax H3-Image） |
| `MINIMAX_BASE_URL` | 默认 `https://api.minimax.cn`（`api.minimaxi.com` 也可用） |
| `SILICONFLOW_API_KEY` | 音频生成（CosyVoice2） |
| `SILICONFLOW_BASE_URL` | 默认 `https://api.siliconflow.cn/v1` |

已存在且非空的文件默认跳过，改了 spec 只补新的。

## 缓存注意（踩过的坑）

Cloudflare 默认给 `.js` / `.css` / 图片加 `cache-control: max-age=14400`（**4 小时**），
边缘缓存命中时用户拿到的还是旧文件，而 HTML 不缓存所以页面框架是新的 —— 表现为「改了没生效」。

两个办法一起用：

1. **改完 JS/CSS 后，把 HTML 里的版本号往上加一格**（`app.js?v=20261113-2` → `-3`），
   版本号变了就是新的缓存键，直接回源。
2. `nginx.conf` 里已配好 `no-cache`（HTML/JS/CSS）和 `max-age=3600`（图片音频），
   **执行 `docker exec oral-site nginx -s reload` 后生效**，之后就不用再动版本号了。

## 已完成

- [x] 静态页面已写好（`site/`）
- [x] `oral-site` 容器已启动，挂在 `backend_hometutor-net`
- [x] 内网连通性已验证：`http://oral-site:80/healthz` → `ok`
- [x] 公网链路已验证：外部节点（印尼/波兰/越南等）返回 **200**
- [x] L1「Hello! 认识新朋友」上线，含 ④ 角色扮演（选角色 → 对手说 → 自动开录 → 停止 → 下一句）
- [x] L2「My Favorite Things 我喜欢什么」上线（魔法袋 / 听音选图 / I Like It! / 我的三样最爱）

## 待完成（需要 Cloudflare 账号权限）

把 `oral.liu1quan.online` 挂到现有隧道。已完成，如需重建：

### 方案 A：Dashboard 点两下（推荐，最快）

1. 打开 <https://one.dash.cloudflare.com> → 选 `liu1quan.online` 这个 account
2. 左侧 **Networks → Tunnels** → 点 `hometutor`
3. **Public Hostname** → **Add a public hostname**
   - Subdomain: `oral`
   - Domain: `liu1quan.online`
   - Path: 留空
   - Type: `HTTP`
   - URL: `oral-site:80`  ← 写**容器名:端口**，不要写 `localhost` 或 `127.0.0.1`
4. Save。DNS 记录 Cloudflare 会自动创建（CNAME → `cbbfc27c-240a-4104-9e6c-b1ab93e2edf1.cfargotunnel.com`，橙云）

### 方案 B：API Token 自动化

1. Cloudflare → My Profile → API Tokens → **Create Token**
   - 权限：`Account / Cloudflare Tunnel / Edit` + `Zone / DNS / Edit`（zone 选 `liu1quan.online`）
2. 在 NAS 上执行：

```bash
export CLOUDFLARE_API_TOKEN='你的token'
./add-hostname.sh
```

脚本会：写 tunnel ingress 配置 → 创建/更新 CNAME DNS 记录。

## 验证

```bash
# 1. DNS 解析
getent hosts oral.liu1quan.online

# 2. HTTP 响应（NAS 本机 IPv6 不通，用 -4）
curl -4 -sI https://oral.liu1quan.online/ | head -1

# 3. 页面内容
curl -4 -s https://oral.liu1quan.online/ | grep -o '<h1>.*</h1>'

# 4. 真正的外部视角（NAS 自己被墙，只能走第三方探针）
curl -s -H "Accept: application/json" \
  "https://check-host.net/check-http?host=https://oral.liu1quan.online/&max_nodes=3"
# 拿到 request_id 后：
curl -s -H "Accept: application/json" \
  "https://check-host.net/check-result/<request_id>"
```

> **注意**：NAS 本机 `curl https://oral.liu1quan.online/` 可能超时——这是**本机到
> Cloudflare 边缘的 IPv6/IPv4 直连被阻断**（`104.21.x` / `172.67.x` 不通），
> 不是站点故障。同一台 NAS 上的 cloudflared 用的是 QUIC 出站到 `198.41.x`，不受影响。
> 所以**必须用外部探针或让朋友实际访问来验证**。

## 日常维护

```bash
cd /home/xxxxl/oral_english

# 改完页面内容，直接刷新浏览器即可（只读挂载，无需重启）
# 需要重载 nginx 配置时：
docker exec oral-site nginx -s reload

# 看日志
docker logs --tail 50 oral-site

# 重启
docker compose up -d
```

## 清理临时隧道

```bash
docker rm -f oral-quicktunnel
```
