# Maia Signage
Maia Signage Rest/WS API Framework with moleculer.services

## Prerequisites
- NodeJS v18+
- MongoDB
- Redis

## Installation

```shell 
npm pm2 --global
```

```shell
git clone git@github.com:cloudmedi/signage_api.git
```
```shell
cd signage_api && npm i
mkdir -P ./public/upload/
chmod -R 777 ./public/upload
```

```shell
sudo nano /etc/hosts
```
add these lines for redis and mongodb

```
127.0.0.1       mongo
127.0.0.1       redis
```
then save & exit

```shell
pm2 start ecosystem.config.js --env=production
```

## ToDo

- [x] rewrite ecosystem file
- [x] Write API Docs
- [x] REST API
- [x] WebSocket API
- [ ] Widgets
  - [x] Image
  - [x] Video
  - [ ] Instagram
  - [ ] Date & Time
  - [ ] Youtube
  - [ ] rss
  - [ ] Twitter
  - [ ] Weather
  - [ ] Webpage
- [ ] Sources
    - [x] Layouts
    - [x] Playlist
    - [ ] Program
    - [ ] Channel
- [x] Screen
  - [x] Device
  - [x] Screen
- [x] Package
- [x] Email
- [ ] Partials
  - [x] Country
  - [x] Currency
  - [x] Ip2Country
