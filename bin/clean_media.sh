#!/bin/bash

# Kullanım: ./silDosyalar.sh /path/to/directory

# Parametre olarak verilen yolu al
TARGET_DIR=$1

# Eğer parametre verilmemişse, hata mesajı göster ve çık
if [ -z "$TARGET_DIR" ]; then
  echo "Kullanım: $0 /path/to/directory"
  exit 1
fi

# Verilen yolun geçerli bir dizin olup olmadığını kontrol et
if [ ! -d "$TARGET_DIR" ]; then
  echo "Hata: $TARGET_DIR geçerli bir dizin değil."
  exit 1
fi

# Belirtilen dizindeki 20 dakikadan eski dosyaları bulun ve silin
find "$TARGET_DIR" -type f -mmin +20 -exec rm -f {} \;

echo "$TARGET_DIR içindeki 20 dakikadan eski dosyalar silindi."
