# finalwisp for InvisiProxy

Wisp runs in [finalwisp](https://github.com/theogbob/finalwisp) processes, replacing the wispurr workers that used to run inside the site's Node process. Two ways to run it:

- **Managed (the default).** `manageWisp: true` in config.json: the site process starts and watches one finalwisp instance per region and pipes Wisp connections to them. Nothing else to set up — this is what `pnpm dev`, the tests, a plain `pnpm start` and the Docker image use. A site rebuild or restart closes the Wisp sessions (they reconnect on their own).
- **nginx + pm2 (production).** nginx sends Wisp straight to pm2-managed instances, so a site rebuild or restart no longer touches Wisp sessions:

```
before:  Cloudflare -> nginx -> Node (site) -> finalwisp -> SOCKS proxies / internet
after:   Cloudflare -> nginx -> finalwisp (x5)           -> SOCKS proxies / internet
                          \-> Node (site, pages only)
```

## Install finalwisp

One static binary for Linux on x86_64 (finalwisp has no npm package):

```sh
V=v1.5.0
curl -LO https://github.com/theogbob/finalwisp/releases/download/$V/finalwisp-$V-x86_64-linux.tar.gz
curl -LO https://github.com/theogbob/finalwisp/releases/download/$V/SHA256SUMS
tar -xzf finalwisp-$V-x86_64-linux.tar.gz
sha256sum -c SHA256SUMS      # must print OK twice
sudo install -m 0755 finalwisp-$V-x86_64-linux/finalwisp /usr/local/bin/finalwisp
finalwisp --version
```

The supervisor and scripts find it at `/usr/local/bin/finalwisp` or on `PATH`; `FINALWISP_BIN` points somewhere else. Without the binary the managed mode logs a warning and the proxy cannot open connections.

## The nginx + pm2 setup

1. **Settings.** Generate the config file shared by all instances from config.json — it carries the destination policy, the limits and the `dns` setting (see below):

   ```sh
   sudo mkdir -p /etc/finalwisp
   sudo node scripts/finalwisp-config.ts /etc/finalwisp/common.conf
   ```

   Re-run it (then `pm2 restart finalwisp.config.cjs`) after changing config.json. It needs to exist before the instances start.

2. **Instances.** Start one per region with the pm2 config in the repo root, and save the process list:

   ```sh
   pm2 start finalwisp.config.cjs && pm2 save
   ```

   They listen on 127.0.0.1 ports 6001 (default region) and 6002 to 6005 (tor, eu, jp, patreon). Each instance runs in its own cgroup (`systemd-run --scope`) with `MEMORY_MAX` (in `finalwisp.config.cjs`) as its memory budget, so a busy region cannot crowd out the others or the site — five instances times `MEMORY_MAX` should stay under about 60 % of RAM. This needs systemd and pm2 running as root; as a normal user add `'--user'` after `'--scope'` in the `scope` line (the memory controller must be delegated to your user session). `pm2 save` keeps the list across reboots when `pm2 startup` is set up, like the site's apps.

3. **nginx.** Copy the two files from `finalwisp/nginx/`:

   | file | goes to |
   |---|---|
   | `finalwisp/nginx/finalwisp-proxy.conf` | `/etc/nginx/snippets/finalwisp-proxy.conf` |
   | `finalwisp/nginx/finalwisp-http.conf` | `/etc/nginx/conf.d/finalwisp-http.conf` |

   In `finalwisp-http.conf` do the Cloudflare part: if your nginx does not already use Cloudflare's real visitor address, uncomment the `set_real_ip_from` lines (one per range from <https://www.cloudflare.com/ips/>) and `real_ip_header CF-Connecting-IP;`. Then inside your site's `server { }` block, before `location /`:

   ```nginx
   include snippets/finalwisp-routes.conf;
   ```

4. **Routes.** Generate the route list from the build's randomized Wisp path names, test and reload nginx:

   ```sh
   pnpm run wisp:nginx
   ```

   The `rebuild` and `refresh` scripts run it too, so the routes follow the path names whenever a build rotates them. Without nginx on the machine it notes that and exits (unrouted regions fall back to the site's managed instances while `manageWisp` is on). All regions are routed by default; `FINALWISP_REGIONS=eu` limits it for a gradual move (empty for the default region), and taking a region out sends it back to the site's managed instances.

5. **The site.** Set `"manageWisp": false` in config.json so the site process stops running its own instances, and restart it (`pnpm restart`). Plain HTTP requests that still reach the site on a Wisp path get a harmless answer instead of the proxy. With all regions routed, a site rebuild or restart no longer touches Wisp sessions.

6. **Check.** Open the site, browse, and watch `pm2 logs finalwisp-default` for errors. For a per-connection log while you test, add `log-conns` and `log-level info` to the instance's args or to the generated common.conf.

Region ports and upstream proxies live in `finalwispRegions` in `src/server/wisp.ts` and are mirrored in `finalwisp.config.cjs` and `scripts/wisp-nginx.ts`. `PATREON_PROXY` is read from `.env`; if it holds a user:password, put it in a private config file instead of the command line (`ps` shows it).

## `socks5://` or `socks5h://`

The instances use `socks5://` for eu, jp and patreon, and `socks5h://` for Tor.

- With `socks5://`, finalwisp looks up the name on your server, refuses private, loopback and your own addresses, then asks the proxy to connect to that address. This is what the wispurr workers did too: they resolved and checked names before dialing, even though their config said `socks5h://`.
- With `socks5h://`, the proxy looks up the name (DNS through Tor or the VPN). Tor needs this for `.onion` names, and Tor refuses private and internal addresses itself. finalwisp cannot see where a name points, so the proxy decides what visitors can reach.

A wireproxy region can be switched to `socks5h://` (`--upstream-trust-dns` is added by itself) only if it runs in full-tunnel mode (no `TunnelDomains`), its `[Interface]` has a `DNS =` line, and you accept that visitors can then reach whatever the VPN side can reach on ports 80 and 443. With `TunnelDomains` a `socks5://` region usually does not match its domain list and the connection leaves directly from your server — a privacy issue, not a safety one; full-tunnel mode avoids it.

## DNS

The `dns` setting in config.json chooses how the instances resolve hostnames:

| setting | what the instances do |
|---|---|
| `"resolve"` (default) | finalwisp's own resolver, reading `/etc/resolv.conf` |
| `"lookup"` | the system resolver |
| `"nextdns:xxx"` or `"xxx.dns.nextdns.io"` | query NextDNS directly over UDP/53 |
| any other hostname or IP | query that server directly over UDP/53 |

`finalwisp --dns-server` takes IP addresses, so a provider hostname is resolved when the config file is generated (`scripts/finalwisp-config.ts`) or when the managed instances start; regenerate or restart if the provider's addresses ever change.

## What moved where

| old (wispurr) | new (finalwisp) |
|---|---|
| five wispurr workers inside the site process | five finalwisp processes (managed by the site, or pm2 under nginx) |
| `allowDirectIP: false` | `no-direct-ip` |
| `allowPrivateIPs`/`allowLoopbackIPs` | private and loopback targets blocked by default; finalwisp reaches its own SOCKS proxy without loopback access, so clients cannot reach 9050 / 7000-7002 directly any more |
| port whitelist 80, 443 (+ the proxy ports) | `allow-ports 80,443` (the proxy ports are no longer needed) |
| blacklist 25, 465, 587 | covered: only 80 and 443 are allowed (and `block-smtp` from the `public` preset) |
| `connectionsLimitPerIP` 200 per 10 s | `max-conns-per-ip 200` (open at once) + `conn-rate-per-ip 20/200` (the rate) |
| `maxConnectsPerSourceIPPerSecond` 500 | `stream-rate-per-ip 500` |
| `maxConnectsPerDestPerSecond` 250, `PerMinute` 6000 | `stream-rate-per-dest 250/250`, `stream-rate-per-dest-minute 6000` |
| `maxConcurrentConnections` 16384, streams per connection 2048 | `max-conns 16384`, `max-streams-per-conn 2048` |
| flood protection / SYN flood signature | the `public` preset's guards (`dest-failfast`, `conn-share`, `fd-admission`, `stream-share`, …) |
| `trustedProxies` + `X-Forwarded-For` | `trusted-proxy 127.0.0.1` + `real-ip-header x-real-ip`; nginx sets `X-Real-IP` (the managed instances keep `x-forwarded-for`) |
| `logLevel: none` | `log-level error` |
| the origin check in `fromOwnSite()` | the same rule in nginx (`$finalwisp_origin_bad`); the site still checks it for the managed mode |
| health checks every 15 s | the managed supervisor keeps them; pm2 restarts a crashed instance under nginx (`curl http://127.0.0.1:6001/` answers 200 for a probe) |
| `handshakeTimeoutSeconds`, the reputation system (off), frame obfuscation (off) | no finalwisp equivalent; finalwisp's own protections replace them |

## Restarts and updates

- `pm2 restart finalwisp-eu` (or stop) lets open sessions finish for up to 30 s, then closes them with a normal WebSocket close. `kill_timeout` in `finalwisp.config.cjs` is 35 s for that; keep it above `drain-timeout` + 2 s if you change one.
- A site rebuild or `pm2 restart invisiproxy` no longer touches Wisp sessions on routed regions (that is the point of the setup).
- To update finalwisp: install the new binary, then `pm2 restart` the instances one at a time.
- Going back: take the region out of `FINALWISP_REGIONS`, rerun `pnpm run wisp:nginx`, and set `manageWisp` back to true if you removed it.
