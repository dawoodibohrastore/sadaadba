# Sadaa Instrumentals - Admin Guide

## Overview
This guide explains how to manage songs, playlists, and content in the Sadaa Instrumentals app.

---

## 📁 Hosting Audio Files on Hostinger

### Step 1: Upload Audio Files to Hostinger

1. **Login to Hostinger** → Go to your hosting panel
2. **Open File Manager** → Navigate to `public_html` folder
3. **Create an audio folder**: `/public_html/audio/`
4. **Upload your MP3 files** to this folder

### Step 2: Get Direct URLs

Your audio files will be accessible at:
```
https://yourdomain.com/audio/song-name.mp3
```

**Example:**
- File location: `/public_html/audio/mawla-ya-salli.mp3`
- Direct URL: `https://yourdomain.com/audio/mawla-ya-salli.mp3`

### Tips for Audio Files:
- Use MP3 format (128-320 kbps recommended)
- Keep file names lowercase with hyphens (no spaces)
- Recommended: Add `.htaccess` to audio folder to enable CORS:
  ```
  Header set Access-Control-Allow-Origin "*"
  ```

---

## ➕ Adding New Songs

### Using API (Recommended)

**Endpoint:** `POST /api/instrumentals`

**Example using curl:**
```bash
curl -X POST "https://your-api-url/api/instrumentals" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Mawla Ya Salli - Peaceful",
    "mood": "Spiritual",
    "duration": 245,
    "duration_formatted": "4:05",
    "is_premium": false,
    "is_featured": false,
    "audio_url": "https://yourdomain.com/audio/mawla-ya-salli.mp3",
    "thumbnail_color": "#4A3463",
    "file_size": 4500000
  }'
```

### Field Descriptions:

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `title` | string | Song title | "Morning Dhikr" |
| `mood` | string | Category | "Calm", "Drums", "Spiritual", "Soft", "Energetic" |
| `duration` | number | Duration in seconds | 245 (for 4:05) |
| `duration_formatted` | string | Human readable | "4:05" |
| `is_premium` | boolean | Paid content? | true or false |
| `is_featured` | boolean | Show in featured banner? | true or false |
| `audio_url` | string | Hostinger URL | "https://yourdomain.com/audio/song.mp3" |
| `thumbnail_color` | string | Card color (hex) | "#4A3463" |
| `file_size` | number | File size in bytes | 4500000 |

---

## ⭐ Making a Song Featured

Songs with `is_featured: true` appear in the hero banner on the home screen.

**Update existing song to featured:**
```bash
curl -X PUT "https://your-api-url/api/instrumentals/{song-id}" \
  -H "Content-Type: application/json" \
  -d '{
    "is_featured": true
  }'
```

**Tips:**
- Keep only 1-2 songs featured at a time
- Featured songs should be your best content
- Both free and premium songs can be featured

---

## 💎 Free vs Premium Songs

### Making a Song FREE:
```bash
curl -X PUT "https://your-api-url/api/instrumentals/{song-id}" \
  -H "Content-Type: application/json" \
  -d '{
    "is_premium": false
  }'
```

### Making a Song PREMIUM:
```bash
curl -X PUT "https://your-api-url/api/instrumentals/{song-id}" \
  -H "Content-Type: application/json" \
  -d '{
    "is_premium": true
  }'
```

**Recommendation:**
- Keep 5-7 free songs to attract users
- Put your best content as premium
- Mix moods in both free and premium

---

## 🎨 Color Codes for Thumbnails

Use these spiritual colors for `thumbnail_color`:

| Color | Hex Code | Mood |
|-------|----------|------|
| Deep Purple | `#4A3463` | Spiritual |
| Teal | `#2D5A4A` | Calm |
| Rose | `#634A5A` | Soft |
| Brown | `#8B5A2B` | Drums |
| Navy | `#2A3A4A` | Night |
| Maroon | `#5A3A4A` | Energetic |

---

## 📋 Viewing All Songs

**Get all songs:**
```bash
curl "https://your-api-url/api/instrumentals"
```

**Filter by mood:**
```bash
curl "https://your-api-url/api/instrumentals?mood=Spiritual"
```

**Filter by premium:**
```bash
curl "https://your-api-url/api/instrumentals?is_premium=true"
```

**Search by name:**
```bash
curl "https://your-api-url/api/instrumentals?search=mawla"
```

---

## 🗑️ Deleting a Song

```bash
curl -X DELETE "https://your-api-url/api/instrumentals/{song-id}"
```

---

## 📊 Admin Statistics

**Get app stats:**
```bash
curl "https://your-api-url/api/admin/stats"
```

Returns:
```json
{
  "total_instrumentals": 15,
  "premium_instrumentals": 8,
  "free_instrumentals": 7,
  "featured_instrumentals": 2,
  "total_users": 150,
  "active_subscriptions": 25,
  "total_playlists": 45
}
```

---

## 🔄 Bulk Update Audio URLs

If you move your audio files to a new location:

```bash
# Get song ID first
curl "https://your-api-url/api/instrumentals" | jq '.[0].id'

# Update the audio URL
curl -X PUT "https://your-api-url/api/instrumentals/{song-id}" \
  -H "Content-Type: application/json" \
  -d '{
    "audio_url": "https://new-domain.com/audio/song.mp3"
  }'
```

---

## 🎵 User Features

### Playlists
- Users can create unlimited playlists
- Add any accessible song to playlists
- Playlists are stored per user

### Favorites
- Users can heart/favorite songs
- Favorites sync across devices (same user)

### Downloads
- Users can download for offline play
- Downloads stored on device
- Premium songs need subscription to download

### Playback
- Loop: Repeats current song
- Shuffle: Random order in queue
- Background play: Continues when app minimized

---

## 🌐 API Endpoints Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/instrumentals` | List all songs |
| GET | `/api/instrumentals/featured` | Get featured songs |
| GET | `/api/instrumentals/{id}` | Get single song |
| POST | `/api/instrumentals` | Add new song |
| PUT | `/api/instrumentals/{id}` | Update song |
| DELETE | `/api/instrumentals/{id}` | Delete song |
| GET | `/api/moods` | List mood categories |
| GET | `/api/admin/stats` | Get statistics |

---

## 💡 Quick Reference Commands

```bash
# Add a free song
curl -X POST "https://your-api-url/api/instrumentals" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Song Name",
    "mood": "Calm",
    "duration": 180,
    "duration_formatted": "3:00",
    "is_premium": false,
    "is_featured": false,
    "audio_url": "https://yourdomain.com/audio/new-song.mp3",
    "thumbnail_color": "#4A3463",
    "file_size": 3000000
  }'

# Add a premium featured song
curl -X POST "https://your-api-url/api/instrumentals" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Premium Featured Song",
    "mood": "Spiritual",
    "duration": 300,
    "duration_formatted": "5:00",
    "is_premium": true,
    "is_featured": true,
    "audio_url": "https://yourdomain.com/audio/premium-song.mp3",
    "thumbnail_color": "#2D5A4A",
    "file_size": 5000000
  }'
```

---

## 🔧 Troubleshooting

**Audio not playing?**
1. Check the URL is accessible in browser
2. Ensure CORS is enabled on Hostinger
3. Verify file format is MP3

**Song not showing?**
1. Check API response for errors
2. Verify mood is one of: Calm, Drums, Spiritual, Soft, Energetic

**Featured banner empty?**
1. Ensure at least one song has `is_featured: true`
2. Refresh the app

---

For support, contact the development team.
