window.predictLeagueShare = {
    // Canvas referansı
    cachedCanvas: null,

    // Görüntü yükleme yardımcısı
    loadImage: function (url) {
        return new Promise((resolve) => {
            if (!url) { resolve(null); return; }
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = url;
        });
    },

    // Yuvarlatılmış dikdörtgen çizme yardımcısı
    drawRoundRect: function (ctx, x, y, width, height, radius, fillStyle, strokeStyle, strokeWidth) {
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(x, y, width, height, radius);
        } else {
            ctx.moveTo(x + radius, y);
            ctx.arcTo(x + width, y, x + width, y + height, radius);
            ctx.arcTo(x + width, y + height, x, y + height, radius);
            ctx.arcTo(x, y + height, x, y, radius);
            ctx.arcTo(x, y, x + width, y, radius);
            ctx.closePath();
        }
        if (fillStyle) {
            ctx.fillStyle = fillStyle;
            ctx.fill();
        }
        if (strokeStyle) {
            ctx.strokeStyle = strokeStyle;
            ctx.lineWidth = strokeWidth || 1;
            ctx.stroke();
        }
    },

    // Metin kırpma yardımcısı
    truncateText: function (ctx, text, maxWidth) {
        if (ctx.measureText(text).width <= maxWidth) return text;
        let truncated = text;
        while (truncated.length > 0 && ctx.measureText(truncated + '…').width > maxWidth) {
            truncated = truncated.slice(0, -1);
        }
        return truncated + '…';
    },

    // Piksel hassasiyetinde HTML5 Canvas kart çizici (1080 x 1350 HD)
    drawCardCanvas: async function (data) {
        if (document.fonts && document.fonts.ready) {
            try { await document.fonts.ready; } catch (e) { }
        }
        // The finance game's receipt card reuses every share path below (Instagram, X, download)
        if (data && data.kind === 'receipt') {
            return this.drawReceiptCanvas(data);
        }
        if (data && data.kind === 'size') {
            return this.drawSizeCanvas(data);
        }

        const W = 1080;
        const H = 1350;
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');

        // 1. Arka plan lacivert gradyanı
        const bgGrad = ctx.createLinearGradient(0, 0, W, H);
        bgGrad.addColorStop(0, '#03091e');
        bgGrad.addColorStop(0.5, '#0a183d');
        bgGrad.addColorStop(1, '#03081a');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        // Arka plan neon parıltısı (radial glow)
        const glowGrad = ctx.createRadialGradient(W - 100, 100, 10, W - 100, 100, 450);
        glowGrad.addColorStop(0, 'rgba(0, 140, 255, 0.35)');
        glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(0, 0, W, H);

        // Dış çerçeve sınırı
        this.drawRoundRect(ctx, 30, 30, W - 60, H - 60, 32, null, 'rgba(255, 255, 255, 0.12)', 3);

        // 2. Üst Header (Lig Adı ve Başlık)
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '700 38px "Archivo", system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText((data.competitionName || 'Champions League').toUpperCase(), 75, 105);

        ctx.fillStyle = '#00D4FF';
        ctx.font = '800 20px "Archivo", system-ui, sans-serif';
        ctx.fillText((data.competitionSub || '2026/27 MONTE CARLO PREDICTION').toUpperCase(), 75, 142);

        // Ayırıcı çizgi
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(75, 175);
        ctx.lineTo(W - 75, 175);
        ctx.stroke();

        // 3. Takım Logosu & Hero Alanı
        const logoImg = await this.loadImage(data.teamLogoUrl);
        const logoX = 75;
        const logoY = 215;
        const logoSize = 120;

        if (logoImg) {
            ctx.save();
            this.drawRoundRect(ctx, logoX, logoY, logoSize, logoSize, 24, 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.15)', 2);
            ctx.drawImage(logoImg, logoX + 15, logoY + 15, logoSize - 30, logoSize - 30);
            ctx.restore();
        } else {
            // Logo yüklenemezse şık takım harf rozeti
            const shortName = (data.teamShortName || (data.teamName || 'TM').substring(0, 3)).toUpperCase();
            this.drawRoundRect(ctx, logoX, logoY, logoSize, logoSize, 24, '#0045B5', 'rgba(255,255,255,0.2)', 2);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '800 36px "Archivo", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(shortName, logoX + logoSize / 2, logoY + logoSize / 2);
            ctx.textBaseline = 'alphabetic';
        }

        // Takım Adı
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 54px "Archivo", system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        const teamNameText = this.truncateText(ctx, data.teamName || 'Takım', 700);
        ctx.fillText(teamNameText, 225, 266);

        // Sıralama Rozeti (Pill) - Dinamik genişlik ve tam metin hizalama
        const rankPillX = 225;
        const rankPillY = 288;
        const rankPillH = 50;
        const bandBg = data.bandBg || '#9BE3BE';

        const rankText = (data.rankText || '1. SIRA').trim();
        const bandLabel = data.bandLabel ? data.bandLabel.trim() : '';

        // Metin genişliklerini doğru fontla ölç
        ctx.font = '900 22px "Archivo", system-ui, sans-serif';
        const rankW = ctx.measureText(rankText).width;

        ctx.font = '700 20px "Archivo", system-ui, sans-serif';
        const dotText = '•  ';
        const dotW = bandLabel ? ctx.measureText(dotText).width : 0;
        const bandTextW = bandLabel ? ctx.measureText(bandLabel).width : 0;

        const padX = 18;
        const gap = 8;
        const totalContentW = padX * 2 + rankW + (bandLabel ? (gap + dotW + bandTextW) : 0);
        const maxPillW = W - rankPillX - 75; // 780px
        const rankPillW = Math.min(maxPillW, Math.max(160, totalContentW));

        this.drawRoundRect(ctx, rankPillX, rankPillY, rankPillW, rankPillH, 14, bandBg, null, 0);

        // Rozet metinlerini dikeyde ortalayarak çiz
        ctx.save();
        ctx.textBaseline = 'middle';
        const pillCenterY = rankPillY + rankPillH / 2 + 1;

        ctx.fillStyle = '#111827';
        ctx.font = '900 22px "Archivo", system-ui, sans-serif';
        ctx.textAlign = 'left';
        const rankStartX = rankPillX + padX;
        ctx.fillText(rankText, rankStartX, pillCenterY);

        if (bandLabel) {
            const bandStartX = rankStartX + rankW + gap;
            const availableBandW = (rankPillX + rankPillW - padX) - bandStartX;

            ctx.font = '700 20px "Archivo", system-ui, sans-serif';
            const fullBandStr = `${dotText}${bandLabel}`;
            const bandTextToDraw = this.truncateText(ctx, fullBandStr, Math.max(60, availableBandW));
            ctx.fillText(bandTextToDraw, bandStartX, pillCenterY);
        }
        ctx.restore();

        // 4. İstatistik Kutuları (3'lü Grid)
        const statY = 385;
        const statH = 150;
        const statW = 295;
        const statGap = 22;

        const stats = [
            { val: data.points || '0.0', lbl: data.pointsLabel || 'Expected Pts' },
            { val: data.record || '0W 0D 0L', lbl: data.recordLabel || 'Record' },
            { val: data.gd || '0.0', lbl: data.gdLabel || 'Goal Diff' }
        ];

        stats.forEach((s, idx) => {
            const sx = 75 + idx * (statW + statGap);
            this.drawRoundRect(ctx, sx, statY, statW, statH, 20, 'rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.1)', 2);

            ctx.fillStyle = '#00D4FF';
            ctx.font = '900 42px "Archivo", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'alphabetic';
            ctx.fillText(s.val, sx + statW / 2, statY + 70);

            ctx.fillStyle = '#94A3B8';
            ctx.font = '600 20px "Archivo", sans-serif';
            ctx.fillText(s.lbl, sx + statW / 2, statY + 115);
        });

        // 5. Olasılık İlerleme Çubuğu (Probs Bar)
        const probY = 575;
        const probW = W - 150;
        const probH = 16;
        const probX = 75;

        // Arka plan ve segmentleri klip ile pürüzsüz çiz
        ctx.save();
        this.drawRoundRect(ctx, probX, probY, probW, probH, 8, 'rgba(255, 255, 255, 0.1)', null, 0);
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(probX, probY, probW, probH, 8);
        } else {
            ctx.rect(probX, probY, probW, probH);
        }
        ctx.clip();

        let currX = probX;
        const top8W = (probW * (data.top8Prob || 0)) / 100;
        const playoffW = (probW * (data.playoffProb || 0)) / 100;
        const elimW = (probW * (data.elimProb || 0)) / 100;

        if (top8W > 0) {
            ctx.fillStyle = '#34D399';
            ctx.fillRect(currX, probY, top8W, probH);
            currX += top8W;
        }
        if (playoffW > 0) {
            ctx.fillStyle = '#FBBF24';
            ctx.fillRect(currX, probY, playoffW, probH);
            currX += playoffW;
        }
        if (elimW > 0) {
            ctx.fillStyle = '#F87171';
            ctx.fillRect(currX, probY, elimW, probH);
        }
        ctx.restore();

        // Olasılık Etiketleri (Dile duyarlı yüzde gösterimi)
        ctx.font = '700 20px "Archivo", sans-serif';
        ctx.fillStyle = '#CBD5E1';
        ctx.textBaseline = 'alphabetic';

        const isTr = (data.top8Label || '').includes('İlk') || (data.competitionSub || '').includes('PUAN');
        const formatPct = (val) => isTr ? `%${Math.round(val || 0)}` : `${Math.round(val || 0)}%`;

        const top8Lbl = data.top8Label || 'Top 8';
        const playoffLbl = data.playoffLabel || 'Play-off';
        const elimLbl = data.elimLabel || 'Eliminated';

        ctx.textAlign = 'left';
        ctx.fillText(`${top8Lbl}: ${formatPct(data.top8Prob)}`, probX, probY + 48);

        ctx.textAlign = 'center';
        ctx.fillText(`${playoffLbl}: ${formatPct(data.playoffProb)}`, probX + probW / 2, probY + 48);

        ctx.textAlign = 'right';
        ctx.fillText(`${elimLbl}: ${formatPct(data.elimProb)}`, probX + probW, probY + 48);

        // 6. Maç Tahminleri Listesi (2 Kolon x 4 Satır)
        const matchBoxY = 660;
        const matchBoxH = 550;
        this.drawRoundRect(ctx, 75, matchBoxY, W - 150, matchBoxH, 24, 'rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0.08)', 2);

        ctx.fillStyle = '#64748B';
        ctx.font = '800 20px "Archivo", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText((data.matchPredictionsLabel || 'MATCH PREDICTIONS').toUpperCase(), 110, matchBoxY + 45);

        const matches = data.matches || [];
        const colW = 430;
        const rowH = 100;
        const startY = matchBoxY + 75;

        matches.forEach((m, idx) => {
            const col = idx >= 4 ? 1 : 0;
            const row = idx % 4;
            const mx = 105 + col * 460;
            const my = startY + row * rowH;

            this.drawRoundRect(ctx, mx, my, colW, 82, 14, 'rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0.06)', 1);

            ctx.save();
            ctx.textBaseline = 'middle';
            const rowCenterY = my + 41;

            // Ev sahibi
            ctx.fillStyle = '#E2E8F0';
            ctx.font = '600 21px "Archivo", sans-serif';
            ctx.textAlign = 'left';
            const homeName = this.truncateText(ctx, m.home, 145);
            ctx.fillText(homeName, mx + 18, rowCenterY);

            // Skor
            ctx.fillStyle = '#00D4FF';
            ctx.font = '900 26px "Archivo", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(m.score || '– : –', mx + colW / 2, rowCenterY);

            // Deplasman
            ctx.fillStyle = '#E2E8F0';
            ctx.font = '600 21px "Archivo", sans-serif';
            ctx.textAlign = 'right';
            const awayName = this.truncateText(ctx, m.away, 145);
            ctx.fillText(awayName, mx + colW - 18, rowCenterY);
            ctx.restore();
        });

        // 7. Alt Footer (Brand & URL)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(75, 1250);
        ctx.lineTo(W - 75, 1250);
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 32px "Archivo", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText('STAGESIMULATOR', 75, 1300);

        ctx.fillStyle = '#00D4FF';
        ctx.font = '700 26px "Archivo", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('stagesimulator.com', W - 75, 1300);

        this.cachedCanvas = canvas;
        return canvas;
    },

    // Splits text into lines that fit maxWidth (at most maxLines, the last one truncated)
    wrapText: function (ctx, text, maxWidth, maxLines) {
        const words = (text || '').split(' ');
        const lines = [];
        let line = '';
        for (const word of words) {
            const test = line ? line + ' ' + word : word;
            if (ctx.measureText(test).width > maxWidth && line) {
                lines.push(line);
                line = word;
            } else {
                line = test;
            }
        }
        if (line) lines.push(line);
        if (lines.length > maxLines) {
            lines.length = maxLines;
            lines[maxLines - 1] = this.truncateText(ctx, lines[maxLines - 1] + '…', maxWidth);
        }
        return lines;
    },

    // Person next to a cube of banknotes, to scale; same layout as Components/MoneyScale.razor
    drawMoneyScale: function (ctx, x, y, w, h, sideM, labels) {
        const personH = 1.75;
        const groundY = y + h - 10;
        const gap = Math.max(0.35, sideM * 0.25);
        const k = Math.min((h - 60) / Math.max(personH, sideM * 1.3), (w - 40) / (0.6 + gap + sideM * 1.35));
        const Y = (m) => groundY - m * k;
        const personCx = x + 20 + 0.3 * k;
        const cubeX = x + 20 + (0.6 + gap) * k;
        const sidePx = Math.max(2, sideM * k);
        const depth = sidePx * 0.3;

        ctx.strokeStyle = 'rgba(32, 30, 29, 0.45)';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x, groundY); ctx.lineTo(x + w, groundY); ctx.stroke();

        // Person
        ctx.fillStyle = '#201e1d';
        const rect = (cx, top, width, height) => {
            this.drawRoundRect(ctx, cx, Y(top), width * k, height * k, Math.min(0.05 * k, 12), '#201e1d');
        };
        ctx.beginPath(); ctx.arc(personCx, Y(personH - 0.11), 0.11 * k, 0, Math.PI * 2); ctx.fill();
        rect(personCx - 0.18 * k, 1.50, 0.36, 0.66);
        rect(personCx - 0.28 * k, 1.47, 0.09, 0.60);
        rect(personCx + 0.19 * k, 1.47, 0.09, 0.60);
        rect(personCx - 0.15 * k, 0.86, 0.13, 0.86);
        rect(personCx + 0.02 * k, 0.86, 0.13, 0.86);

        // Cube: top, side, front with band lines
        const top = Y(sideM);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#3f5e33';
        const poly = (pts, fill) => {
            ctx.beginPath();
            pts.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py));
            ctx.closePath();
            ctx.fillStyle = fill; ctx.fill(); ctx.stroke();
        };
        poly([[cubeX, top], [cubeX + depth, top - depth], [cubeX + sidePx + depth, top - depth], [cubeX + sidePx, top]], '#a9cb95');
        poly([[cubeX + sidePx, top], [cubeX + sidePx + depth, top - depth], [cubeX + sidePx + depth, groundY - depth], [cubeX + sidePx, groundY]], '#5e8a4c');
        poly([[cubeX, top], [cubeX + sidePx, top], [cubeX + sidePx, groundY], [cubeX, groundY]], '#7fa96a');
        const bands = Math.max(1, Math.min(14, Math.floor(sidePx / 14)));
        ctx.strokeStyle = 'rgba(47, 74, 38, 0.45)';
        ctx.lineWidth = 1.5;
        for (let i = 1; i < bands; i++) {
            const by = top + sidePx * i / bands;
            ctx.beginPath(); ctx.moveTo(cubeX, by); ctx.lineTo(cubeX + sidePx, by); ctx.stroke();
        }

        // Labels
        ctx.textAlign = 'center';
        ctx.fillStyle = '#201e1d';
        ctx.font = '800 26px "Archivo", sans-serif';
        ctx.fillText(labels.side, cubeX + sidePx / 2, Math.min(top - depth - 12, groundY - 16));
        ctx.font = '700 22px "Archivo", sans-serif';
        ctx.fillStyle = 'rgba(32, 30, 29, 0.7)';
        if (personH * k < 40) {
            ctx.strokeStyle = '#201e1d';
            ctx.setLineDash([5, 5]);
            ctx.beginPath(); ctx.moveTo(personCx, Y(personH) - 8); ctx.lineTo(personCx, groundY - 90); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillText(labels.person, personCx, groundY - 100);
        } else {
            ctx.fillText(labels.personHeight, personCx, Y(personH) - 12);
        }
    },

    // Finance game receipt card (1080 x 1350), in the game's own look: paper grey, ink, red accents
    drawReceiptCanvas: function (d) {
        const W = 1080, H = 1350, M = 72;
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');
        const ink = '#201e1d', red = '#ae1800', muted = 'rgba(32, 30, 29, 0.6)', rule = 'rgba(32, 30, 29, 0.4)';
        const font = (weight, size) => `${weight} ${size}px "Archivo", system-ui, sans-serif`;
        const hr = (y, width) => { ctx.fillStyle = rule; ctx.fillRect(M, y, W - 2 * M, width || 3); };

        ctx.fillStyle = '#f3f2f2';
        ctx.fillRect(0, 0, W, H);

        // Header
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = ink;
        ctx.font = font(800, 34);
        ctx.textAlign = 'left';
        ctx.fillText(d.brand, M, 118);
        ctx.fillStyle = red;
        ctx.font = font(800, 26);
        ctx.textAlign = 'right';
        ctx.fillText(d.badge, W - M, 116);
        hr(146);

        // Verdict and whose money
        let y = 236;
        ctx.textAlign = 'left';
        ctx.fillStyle = ink;
        ctx.font = font(800, 72);
        for (const line of this.wrapText(ctx, d.verdict, W - 2 * M, 2)) {
            ctx.fillText(line, M, y);
            y += 80;
        }
        ctx.fillStyle = muted;
        ctx.font = font(600, 32);
        ctx.fillText(this.truncateText(ctx, d.subtitle, W - 2 * M), M, y);
        y += 40;
        hr(y);
        y += 62;

        // Receipt lines
        ctx.font = font(600, 32);
        for (const l of d.lines) {
            ctx.fillStyle = red;
            ctx.font = font(800, 32);
            ctx.textAlign = 'left';
            ctx.fillText(l.qty, M, y);
            ctx.fillStyle = ink;
            ctx.textAlign = 'right';
            ctx.fillText(l.total, W - M, y);
            const totalW = ctx.measureText(l.total).width;
            ctx.font = font(600, 32);
            ctx.textAlign = 'left';
            ctx.fillText(this.truncateText(ctx, l.name, W - 2 * M - totalW - 130), M + 100, y);
            y += 58;
        }
        if (d.moreLine) {
            ctx.fillStyle = muted;
            ctx.font = font(600, 28);
            ctx.fillText(d.moreLine, M + 100, y - 8);
            y += 44;
        }
        hr(y - 30, 2);
        y += 22;
        ctx.fillStyle = ink;
        ctx.font = font(800, 38);
        ctx.textAlign = 'left';
        ctx.fillText(d.totalLabel, M, y);
        ctx.textAlign = 'right';
        ctx.fillText(d.total, W - M, y);
        y += 40;
        hr(y);

        // Bottom block: minimum wage punchline (Turkish) on the left, to-scale drawing on the right
        const blockTop = y + 40, blockBottom = H - 150;
        const drawX = d.wage ? 560 : M, drawW = W - M - drawX;
        if (d.wage) {
            ctx.textAlign = 'left';
            ctx.fillStyle = muted;
            ctx.font = font(700, 28);
            let wy = blockTop + 50;
            for (const line of this.wrapText(ctx, d.wageLabel, 440, 3)) { ctx.fillText(line, M, wy); wy += 36; }
            ctx.fillStyle = red;
            ctx.font = font(800, 76);
            for (const line of this.wrapText(ctx, d.wage, 440, 2)) { wy += 70; ctx.fillText(line, M, wy); }
        }
        ctx.textAlign = 'left';
        ctx.fillStyle = red;
        ctx.font = font(800, 22);
        ctx.fillText(d.scaleTitle, drawX, blockTop + 10);
        this.drawMoneyScale(ctx, drawX, blockTop + 20, drawW, blockBottom - blockTop - 20, d.scaleSideM,
            { side: d.scaleSide, person: d.personLabel, personHeight: d.personHeight });

        // Footer: call to action on red
        ctx.fillStyle = '#ec3013';
        ctx.fillRect(0, H - 118, W, 118);
        ctx.fillStyle = '#ffffff';
        ctx.font = font(800, 36);
        ctx.textAlign = 'left';
        ctx.fillText(d.cta, M, H - 48);
        ctx.font = font(700, 28);
        ctx.textAlign = 'right';
        ctx.fillText(d.url, W - M, H - 50);

        this.cachedCanvas = canvas;
        return canvas;
    },

    // Money size card (1080 x 1350): the amount, a one-line comparison and the to-scale drawing
    drawSizeCanvas: function (d) {
        const W = 1080, H = 1350, M = 72;
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');
        const ink = '#201e1d', red = '#ae1800', muted = 'rgba(32, 30, 29, 0.65)', rule = 'rgba(32, 30, 29, 0.4)';
        const font = (weight, size) => `${weight} ${size}px "Archivo", system-ui, sans-serif`;

        ctx.fillStyle = '#f3f2f2';
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = ink;
        ctx.font = font(800, 34);
        ctx.textAlign = 'left';
        ctx.fillText(d.brand, M, 118);
        ctx.fillStyle = red;
        ctx.font = font(800, 26);
        ctx.textAlign = 'right';
        ctx.fillText(d.badge, W - M, 116);
        ctx.fillStyle = rule;
        ctx.fillRect(M, 146, W - 2 * M, 3);

        // Amount: as large as fits on one line
        ctx.textAlign = 'left';
        ctx.fillStyle = ink;
        let size = 120;
        do { ctx.font = font(800, size); size -= 4; } while (ctx.measureText(d.amount).width > W - 2 * M && size > 40);
        ctx.fillText(d.amount, M, 290);

        ctx.fillStyle = red;
        ctx.font = font(800, 58);
        let y = 376;
        for (const line of this.wrapText(ctx, d.headline, W - 2 * M, 2)) { ctx.fillText(line, M, y); y += 66; }

        this.drawMoneyScale(ctx, M, y + 10, W - 2 * M, 1000 - y, d.scaleSideM,
            { side: d.scaleSide, person: d.personLabel, personHeight: d.personHeight });

        ctx.textAlign = 'left'; // drawMoneyScale leaves the alignment centred
        ctx.fillStyle = muted;
        ctx.font = font(600, 30);
        let fy = 1070;
        for (const fact of d.facts) {
            ctx.fillText(this.truncateText(ctx, fact, W - 2 * M), M, fy);
            fy += 44;
        }

        ctx.fillStyle = '#ec3013';
        ctx.fillRect(0, H - 118, W, 118);
        ctx.fillStyle = '#ffffff';
        ctx.font = font(700, 24);
        const urlWidth = ctx.measureText(d.url).width;
        ctx.textAlign = 'right';
        ctx.fillText(d.url, W - M, H - 50);
        ctx.font = font(800, 32);
        ctx.textAlign = 'left';
        ctx.fillText(this.truncateText(ctx, d.cta, W - 2 * M - urlWidth - 28), M, H - 48);

        this.cachedCanvas = canvas;
        return canvas;
    },

    // True when the browser can hand an image file to the system share sheet (most phones, Chrome/Safari on desktop)
    canShareFiles: function () {
        try {
            const probe = new File([new Blob(['x'], { type: 'image/png' })], 'probe.png', { type: 'image/png' });
            return !!(navigator.canShare && navigator.canShare({ files: [probe] }));
        } catch (e) {
            return false;
        }
    },

    // Sends the card image, text and link together through the system share sheet, so the recipient sees the
    // picture itself instead of a bare link. Returns 'shared', 'cancelled' or 'unsupported'.
    shareNative: async function (cardData, fileName, title, text, url) {
        try {
            const canvas = await this.drawCardCanvas(cardData);
            const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
            if (!blob) return 'unsupported';
            const file = new File([blob], fileName || 'stagesimulator.png', { type: 'image/png' });
            // The link goes inside the text: several apps drop the separate url field when files are attached
            const message = [text, url].filter(Boolean).join(' ');
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: title || 'StageSimulator', text: message });
                return 'shared';
            }
            if (navigator.share) {
                await navigator.share({ title: title || 'StageSimulator', text: text || '', url: url });
                return 'shared';
            }
            return 'unsupported';
        } catch (err) {
            if (err && err.name === 'AbortError') return 'cancelled';
            console.warn('Paylaşım hatası:', err);
            return 'unsupported';
        }
    },

    // Kart önizlemesini render edip DataURL olarak döndürme
    renderCardPreview: async function (cardData) {
        const canvas = await this.drawCardCanvas(cardData);
        return canvas.toDataURL('image/png');
    },

    // Blob üretimi
    getCanvasBlob: async function (cardData) {
        if (!this.cachedCanvas) {
            await this.drawCardCanvas(cardData);
        }
        return new Promise((resolve) => {
            this.cachedCanvas.toBlob((blob) => resolve(blob), 'image/png');
        });
    },

    // Mobil Yerel Paylaşım (Web Share API)
    shareCard: async function (cardData, title, text) {
        try {
            const canvas = await this.drawCardCanvas(cardData);
            const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
            if (!blob) return false;

            const file = new File([blob], "stagesimulator-prediction.png", { type: "image/png" });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: title || "StageSimulator",
                    text: text || "Check out my European league phase prediction on StageSimulator!",
                    files: [file]
                });
                return true;
            } else if (navigator.share) {
                await navigator.share({
                    title: title || "StageSimulator",
                    text: text || "Check out my European league phase prediction on StageSimulator!",
                    url: window.location.href
                });
                return true;
            } else {
                this.downloadBlob(blob, "stagesimulator-prediction.png");
                return false;
            }
        } catch (err) {
            if (err.name !== 'AbortError') console.error("Paylaşım hatası:", err);
            return false;
        }
    },

    // Instagram Hikaye Paylaşımı (İşletim sistemi paylaşım menüsünü KESİNLİKLE ATLAYIP direkt Instagram Story Kamerasını açar)
    shareToInstagram: async function (cardData) {
        try {
            const canvas = await this.drawCardCanvas(cardData);
            const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
            if (!blob) return false;

            // 1. Görseli galerine/dosyalarına 1. sırada yerleşecek şekilde indir
            this.downloadBlob(blob, "tahmin-kartim-instagram.png");

            // 2. Panoya da görsel kopyalamayı dene
            try {
                if (navigator.clipboard && window.ClipboardItem) {
                    const item = new ClipboardItem({ "image/png": blob });
                    await navigator.clipboard.write([item]);
                }
            } catch (e) {
                console.warn("Panoya kopyalama atlandı:", e);
            }

            // 3. Telefonun varsayılan paylaşım menüsünü (navigator.share) açma!
            // Doğrudan Instagram Story Kamerasını başlat
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            if (isMobile) {
                const start = Date.now();
                window.location.href = "instagram-stories://share";

                // Eğer instagram-stories şeması yanıt vermezse story-camera şemasını dene
                setTimeout(() => {
                    if (Date.now() - start < 1800) {
                        window.location.href = "instagram://story-camera";
                    }
                }, 800);
            } else {
                window.open("https://www.instagram.com/", "_blank");
            }
            return true;
        } catch (e) {
            console.warn("Instagram paylaşım hatası:", e);
            return false;
        }
    },

    // Görsel İndirme
    downloadCard: async function (cardData, filename) {
        const canvas = await this.drawCardCanvas(cardData);
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (blob) {
            this.downloadBlob(blob, filename || "tahmin-kartim.png");
            return true;
        }
        return false;
    },

    // X (Twitter) için hem panoya kopyalama hem yerel X UYGULAMASINI direkt başlatma
    shareToX: async function (cardData, tweetUrl, fullText) {
        // 1. Görseli panoya kopyalamayı dene (destekleyen cihazlarda)
        try {
            const canvas = await this.drawCardCanvas(cardData);
            const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));

            if (blob && navigator.clipboard && window.ClipboardItem) {
                const item = new ClipboardItem({ "image/png": blob });
                await navigator.clipboard.write([item]);
            }
        } catch (e) {
            console.warn("Görsel kopyalanamadı:", e);
        }

        // 2. Mobil cihazlarda doğrudan X (Twitter) NATIVE UYGULAMASINI başlatma (twitter:// URI Scheme)
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
            const textToUse = fullText || tweetUrl;
            const nativeAppUrl = `twitter://post?message=${encodeURIComponent(textToUse)}`;

            const start = Date.now();
            window.location.href = nativeAppUrl;

            // Eğer telefonda X uygulaması yüklü değilse 1.2 sn sonra varsayılan web adresine düş
            setTimeout(() => {
                if (Date.now() - start < 2000) {
                    window.location.href = tweetUrl;
                }
            }, 1200);
        } else {
            const win = window.open(tweetUrl, '_blank');
            if (!win) {
                window.location.href = tweetUrl;
            }
        }
        return true;
    },

    // Blob indirme
    downloadBlob: function (blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // Metin kopyalama
    copyToClipboard: async function (text) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch (err) {
            // In-app browsers (Instagram, X) often deny the async clipboard API; fall back below
            console.warn("Clipboard API reddedildi, eski yöntem deneniyor:", err);
        }
        try {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.setAttribute("readonly", "");
            textArea.style.position = "fixed";
            textArea.style.opacity = "0";
            document.body.appendChild(textArea);
            textArea.select();
            const ok = document.execCommand("copy");
            document.body.removeChild(textArea);
            return ok;
        } catch (err) {
            console.error("Kopyalama hatası:", err);
            return false;
        }
    },

    // Mobil cihazlarda ekranın yakınlaşmış kalmasını önlemek ve klavyeyi kapatmak için viewport sıfırlayıcı
    resetViewport: function () {
        try {
            if (document.activeElement && typeof document.activeElement.blur === 'function') {
                document.activeElement.blur();
            }
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
            
            // Viewport meta etiketini tazeleyerek tarayıcının zoom'unu 1.0 seviyesine döndürme
            const viewportMeta = document.querySelector('meta[name="viewport"]');
            if (viewportMeta) {
                const currentContent = viewportMeta.getAttribute('content');
                viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
            }
        } catch (e) {
            console.warn("Viewport resetleme atlandı:", e);
        }
    }
};
