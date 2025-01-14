# Maia Signage
Maia Signage Rest/WS API Framework with moleculer.services

## Prerequisites
- NodeJS v18+
- MongoDB
- Redis
- ffmpeg
- imageMagick

## Installation

```shell 
npm i pm2 --global
```

```shell
git clone git@github.com:cloudmedi/signage_api.git
git checkout Production-v1.1
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
  - [ ] Instagram (in progress)
  - [ ] Date & Time
  - [x] Youtube
  - [ ] rss
  - [ ] Twitter (in progress)
  - [ ] Weather
  - [x] Webpage
- [ ] Groups
- [ ] Sources
    - [x] Layouts
    - [x] Playlist
    - [ ] Program (schedule)
    - [ ] Channel
- [x] Screen
  - [x] Device
  - [x] Screen
- [x] Package
- [x] Email
- [ ] Partials
  - [x] Country (data dosyasındaki idler silinecek)
  - [x] Currency
  - [x] Ip2Country
- [x] Payment
  - [x] Iyzico
    - [x] Ürün ekleme
    - [x] Kullanıcı Ekleme
    - [ ] Abonelik (in progress)
