# Maia Signage
Maia Signage Rest/WS API Framework with moleculer.services

## Prerequisites
- NodeJS v18+
- MongoDB
- Redis

## Installation

``$ npm pm2 --global``

``$ git clone git@github.com:cloudmedi/signage_api.git``

``cd signage_api && npm i``

``mkdir -P ./public/upload/``
``chmod -R 777 ./public/upload``

``pm2 start ecosystem.config.js``

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
