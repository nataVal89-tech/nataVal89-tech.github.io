# Иконка «Хроники Сыщика»

Новая растровая эмблема: силуэт сыщика в шляпе и поднятом воротнике, пергамент на почти чёрном фоне, одна сургучная лента. Без текста, рамок и мелких предметов.

Создана встроенным imagegen 14 октября 2026 года. Исходник сохранён в `icon-noir-source.png`. `icon-noir.png` — экспорт 1024 × 1024; `icon-noir-adaptive.png` — экспорт с дополнительной безопасной зоной для масок Android; `favicon-noir.png` — 48 × 48. Масштабирование и отступы выполнены штатным macOS `sips`. `app.json` подключает новые файлы; прежние изображения сохранены.

Финальный промпт:

> Create a finished mobile app icon for the Russian noir graphic-novel detective game «Хроники Сыщика». Use case: logo-brand, app icon, square 1024x1024. ONE powerful minimal emblem: a detective in a fedora and high coat collar, reduced to a few bold connected shapes in warm aged parchment #d8c4a6 on a nearly black brown #0e0a07 full-bleed background. The face is entirely dark negative space, mysterious, not a realistic person. A single restrained scarlet #8f281e stroke on the hat band suggests the red thread of an investigation. Art direction: sophisticated 1930s printed book-cover / graphic detective noir, crisp silhouette with very subtle ink grain, matte, flat 2D. Extremely simple, recognizable at 48 pixels. Center all essential artwork within the middle 60% of the canvas to survive circular Android cropping, generous quiet dark margins. No lettering, no monograms, no border, no enclosing badge, no 3D, no glow, no metallic shine, no gradient gloss, no shadows, no tiny details, no additional objects, no device mockup, no rounded outer corners. Output the icon artwork alone.

`scripts/generate_app_assets.py` сохраняет старые программные эмблемы для совместимости и не перезаписывает новые `*-noir*` файлы.
