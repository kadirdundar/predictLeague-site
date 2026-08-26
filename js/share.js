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
        ctx.fillText((data.competitionName || 'Şampiyonlar Ligi').toUpperCase(), 75, 105);

        ctx.fillStyle = '#00D4FF';
        ctx.font = '800 20px "Archivo", system-ui, sans-serif';
        ctx.fillText((data.competitionSub || '2024/25 MONTE CARLO PUAN TAHMİNİ').toUpperCase(), 75, 142);

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
            const shortName = (data.teamShortName || data.teamName.substring(0, 3)).toUpperCase();
            this.drawRoundRect(ctx, logoX, logoY, logoSize, logoSize, 24, '#0045B5', 'rgba(255,255,255,0.2)', 2);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '800 36px "Archivo", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(shortName, logoX + logoSize / 2, logoY + 72);
        }

        // Takım Adı
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 58px "Archivo", system-ui, sans-serif';
        ctx.textAlign = 'left';
        const teamNameText = this.truncateText(ctx, data.teamName || 'Takım', 700);
        ctx.fillText(teamNameText, 225, 268);

        // Sıralama Rozeti (Pill)
        const rankPillW = 560;
        const rankPillH = 54;
        const rankPillX = 225;
        const rankPillY = 290;
        const bandBg = data.bandBg || '#9BE3BE';

        this.drawRoundRect(ctx, rankPillX, rankPillY, rankPillW, rankPillH, 16, bandBg, null, 0);

        ctx.fillStyle = '#16150F';
        ctx.font = '900 24px "Archivo", sans-serif';
        ctx.fillText(`${data.rankText || '1. SIRA'}`, rankPillX + 20, rankPillY + 36);

        ctx.font = '700 21px "Archivo", sans-serif';
        ctx.fillText(`· ${data.bandLabel || ''}`, rankPillX + 135, rankPillY + 36);

        // 4. İstatistik Kutuları (3'lü Grid)
        const statY = 385;
        const statH = 150;
        const statW = 295;
        const statGap = 22;

        const stats = [
            { val: data.points || '0.0', lbl: data.pointsLabel || 'Tahmini Puan' },
            { val: data.record || '0G 0B 0M', lbl: data.recordLabel || 'Derece' },
            { val: data.gd || '0.0', lbl: data.gdLabel || 'Averaj' }
        ];

        stats.forEach((s, idx) => {
            const sx = 75 + idx * (statW + statGap);
            this.drawRoundRect(ctx, sx, statY, statW, statH, 20, 'rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.1)', 2);

            ctx.fillStyle = '#00D4FF';
            ctx.font = '900 42px "Archivo", sans-serif';
            ctx.textAlign = 'center';
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

        this.drawRoundRect(ctx, probX, probY, probW, probH, 8, 'rgba(255, 255, 255, 0.1)', null, 0);

        let currX = probX;
        const top8W = (probW * (data.top8Prob || 0)) / 100;
        const playoffW = (probW * (data.playoffProb || 0)) / 100;
        const elimW = (probW * (data.elimProb || 0)) / 100;

        if (top8W > 0) {
            this.drawRoundRect(ctx, currX, probY, top8W, probH, 8, '#34D399', null, 0);
            currX += top8W;
        }
        if (playoffW > 0) {
            this.drawRoundRect(ctx, currX, probY, playoffW, probH, 8, '#FBBF24', null, 0);
            currX += playoffW;
        }
        if (elimW > 0) {
            this.drawRoundRect(ctx, currX, probY, elimW, probH, 8, '#F87171', null, 0);
        }

        // Olasılık Etiketleri
        ctx.font = '700 20px "Archivo", sans-serif';
        ctx.fillStyle = '#CBD5E1';

        const top8Lbl = data.top8Label || 'Top 8';
        const playoffLbl = data.playoffLabel || 'Play-off';
        const elimLbl = data.elimLabel || 'Elimination';

        ctx.textAlign = 'left';
        ctx.fillText(`${top8Lbl}: %${Math.round(data.top8Prob || 0)}`, probX, probY + 50);

        ctx.textAlign = 'center';
        ctx.fillText(`${playoffLbl}: %${Math.round(data.playoffProb || 0)}`, probX + probW / 2, probY + 50);

        ctx.textAlign = 'right';
        ctx.fillText(`${elimLbl}: %${Math.round(data.elimProb || 0)}`, probX + probW, probY + 50);

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

            // Ev sahibi
            ctx.fillStyle = '#E2E8F0';
            ctx.font = '600 21px "Archivo", sans-serif';
            ctx.textAlign = 'left';
            const homeName = this.truncateText(ctx, m.home, 140);
            ctx.fillText(homeName, mx + 16, my + 48);

            // Skor
            ctx.fillStyle = '#00D4FF';
            ctx.font = '900 26px "Archivo", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(m.score || '– : –', mx + colW / 2, my + 50);

            // Deplasman
            ctx.fillStyle = '#E2E8F0';
            ctx.font = '600 21px "Archivo", sans-serif';
            ctx.textAlign = 'right';
            const awayName = this.truncateText(ctx, m.away, 140);
            ctx.fillText(awayName, mx + colW - 16, my + 48);
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
        ctx.fillText('STAGESIMULATOR', 75, 1300);

        ctx.fillStyle = '#00D4FF';
        ctx.font = '700 26px "Archivo", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('stagesimulator.com', W - 75, 1300);

        this.cachedCanvas = canvas;
        return canvas;
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
            } else {
                const textArea = document.createElement("textarea");
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand("copy");
                document.body.removeChild(textArea);
                return true;
            }
        } catch (err) {
            console.error("Kopyalama hatası:", err);
            return false;
        }
    }
};
