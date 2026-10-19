// Renders menu-system concepts for pearldrop.com v3 with plain Java2D.
// Run: java MenuConcepts.java <outdir>
import java.awt.*;
import java.awt.font.TextAttribute;
import java.awt.geom.*;
import java.awt.image.BufferedImage;
import java.io.File;
import java.util.*;
import java.util.List;
import javax.imageio.ImageIO;

public class MenuConcepts {
    static final int W = 1440, H = 900, S = 2;
    static final String FONT_DIR = "/usr/share/fonts/opentype/inter/";

    static final Color CYAN = new Color(0x2FD8FF);
    static final Color CYAN_DIM = new Color(0x7FCFEA);
    static final Color INK = new Color(0x050D1C);
    static final Color PANEL = new Color(8, 20, 42, 232);
    static final Color LINE = new Color(255, 255, 255, 22);

    static Color white(int a) { return new Color(255, 255, 255, a); }
    static Color cyan(int a) { return new Color(47, 216, 255, a); }

    // ---------- fonts ----------
    static final Map<String, Font> BASE = new HashMap<>();
    static Font font(String face, float size) {
        try {
            Font f = BASE.get(face);
            if (f == null) {
                f = Font.createFont(Font.TRUETYPE_FONT, new File(FONT_DIR + face + ".otf"));
                BASE.put(face, f);
            }
            return f.deriveFont(size);
        } catch (Exception e) { throw new RuntimeException(e); }
    }
    static Font tracked(Font f, float t) {
        return f.deriveFont(Map.of(TextAttribute.TRACKING, t));
    }
    static Font label() { return tracked(font("Inter-SemiBold", 11f), 0.14f); }

    // ---------- canvas ----------
    static class Canvas {
        final BufferedImage img = new BufferedImage(W * S, H * S, BufferedImage.TYPE_INT_RGB);
        final Graphics2D g = img.createGraphics();
        BufferedImage bg, blur;
        Canvas() {
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
            g.setRenderingHint(RenderingHints.KEY_FRACTIONALMETRICS, RenderingHints.VALUE_FRACTIONALMETRICS_ON);
            g.setRenderingHint(RenderingHints.KEY_STROKE_CONTROL, RenderingHints.VALUE_STROKE_PURE);
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.scale(S, S);
        }
        void text(String s, double x, double y, Font f, Color c) {
            g.setFont(f); g.setColor(c); g.drawString(s, (float) x, (float) y);
        }
        double width(String s, Font f) { return g.getFontMetrics(f).getStringBounds(s, g).getWidth(); }
        void fill(Shape s, Color c) { g.setColor(c); g.fill(s); }
        void stroke(Shape s, Color c, float w) {
            g.setColor(c);
            g.setStroke(new BasicStroke(w, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
            g.draw(s);
        }
        /** Frosted panel: blurred hero behind a tinted fill. */
        void glass(Shape s, Color tint) {
            Shape old = g.getClip();
            g.clip(s);
            g.drawImage(blur, 0, 0, W, H, null);
            g.setClip(old);
            fill(s, tint);
        }
        void save(File f) throws Exception { ImageIO.write(img, "png", f); }
    }

    static RoundRectangle2D rr(double x, double y, double w, double h, double r) {
        return new RoundRectangle2D.Double(x, y, w, h, r * 2, r * 2);
    }

    // ---------- glyphs ----------
    static void chevron(Canvas c, double x, double y, boolean up, Color col) {
        Path2D p = new Path2D.Double();
        double d = up ? -1 : 1;
        p.moveTo(x - 4, y - 2 * d); p.lineTo(x, y + 2 * d); p.lineTo(x + 4, y - 2 * d);
        c.stroke(p, col, 1.7f);
    }
    static void arrow(Canvas c, double x, double y, double len, Color col, float w) {
        Path2D p = new Path2D.Double();
        p.moveTo(x, y); p.lineTo(x + len, y);
        p.moveTo(x + len - 4.5, y - 4.5); p.lineTo(x + len, y); p.lineTo(x + len - 4.5, y + 4.5);
        c.stroke(p, col, w);
    }
    static void icon(Canvas c, String name, double cx, double cy, Color col) {
        float w = 1.6f;
        switch (name) {
            case "people" -> {
                c.stroke(new Ellipse2D.Double(cx - 4, cy - 8, 8, 8), col, w);
                c.stroke(new Arc2D.Double(cx - 8, cy + 1, 16, 14, 0, 180, Arc2D.OPEN), col, w);
            }
            case "play" -> {
                Path2D p = new Path2D.Double();
                p.moveTo(cx - 4, cy - 6); p.lineTo(cx + 6, cy); p.lineTo(cx - 4, cy + 6); p.closePath();
                c.fill(p, col);
            }
            case "star" -> {
                Path2D p = new Path2D.Double();
                for (int i = 0; i < 10; i++) {
                    double r = i % 2 == 0 ? 8.5 : 3.8, a = -Math.PI / 2 + i * Math.PI / 5;
                    double px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
                    if (i == 0) p.moveTo(px, py); else p.lineTo(px, py);
                }
                p.closePath();
                c.stroke(p, col, w);
            }
            case "path" -> {
                c.stroke(new Line2D.Double(cx - 5, cy, cx + 5, cy), col, w);
                for (int i = -1; i <= 1; i++) c.stroke(new Ellipse2D.Double(cx + i * 8 - 2.5, cy - 2.5, 5, 5), col, w);
            }
            case "lens" -> {
                c.stroke(new Ellipse2D.Double(cx - 8, cy - 8, 16, 16), col, w);
                c.stroke(new Ellipse2D.Double(cx - 3, cy - 3, 6, 6), col, w);
            }
            case "briefcase" -> {
                c.stroke(rr(cx - 8, cy - 4, 16, 11, 2), col, w);
                c.stroke(rr(cx - 3.5, cy - 8, 7, 4, 1), col, w);
            }
            case "info" -> {
                c.stroke(new Ellipse2D.Double(cx - 8, cy - 8, 16, 16), col, w);
                c.stroke(new Line2D.Double(cx, cy - 1, cx, cy + 4), col, w);
                c.fill(new Ellipse2D.Double(cx - 1, cy - 5, 2, 2), col);
            }
        }
    }

    // ---------- hero background ----------
    static double gauss(double x, double y, double cx, double cy, double sx, double sy) {
        double dx = (x - cx) / sx, dy = (y - cy) / sy;
        return Math.exp(-(dx * dx + dy * dy));
    }
    static double hash(int x, int y) {
        long h = x * 374761393L + y * 668265263L;
        h = (h ^ (h >> 13)) * 1274126177L;
        return ((h ^ (h >> 16)) & 0xffff) / 65535.0;
    }
    static Color mix(Color a, Color b, double t) {
        t = Math.max(0, Math.min(1, t));
        return new Color((int) (a.getRed() + (b.getRed() - a.getRed()) * t),
                (int) (a.getGreen() + (b.getGreen() - a.getGreen()) * t),
                (int) (a.getBlue() + (b.getBlue() - a.getBlue()) * t));
    }

    static BufferedImage hero() {
        Canvas c = new Canvas();
        Graphics2D g = c.g;
        g.setPaint(new GradientPaint(0, 0, new Color(0x0B2A55), 0, H, new Color(0x061632)));
        g.fillRect(0, 0, W, H);
        g.setPaint(new RadialGradientPaint(new Point2D.Double(1180, 160), 760,
                new float[]{0f, 1f}, new Color[]{new Color(60, 140, 230, 150), new Color(60, 140, 230, 0)}));
        g.fillRect(0, 0, W, H);

        // Sequinned figure, drawn as a field of dots.
        Color lo = new Color(0x0A2C5E), hi = new Color(0xD8F4FF);
        for (int gy = 0; gy < H / 7 + 1; gy++) {
            for (int gx = 0; gx < (W - 640) / 7 + 1; gx++) {
                double x = 640 + gx * 7 + (gy % 2) * 3.5, y = gy * 7;
                double body = Math.max(gauss(x, y, 1090, 700, 190, 330),
                        Math.max(gauss(x, y, 940, 470, 170, 90), gauss(x, y, 1220, 420, 110, 160)));
                if (body < 0.12) continue;
                double sheen = Math.pow(Math.max(0, Math.sin(x * 0.021 + y * 0.012) * Math.cos(y * 0.017 - x * 0.006)), 3);
                double sparkle = hash(gx, gy) > 0.965 ? 0.9 : 0;
                double v = body * (0.35 + 0.75 * sheen) + sparkle * body;
                double fade = Math.min(1, (x - 640) / 180.0);
                Color col = mix(lo, hi, v);
                g.setColor(new Color(col.getRed(), col.getGreen(), col.getBlue(), (int) (255 * fade * Math.min(1, body * 1.6))));
                g.fill(new Ellipse2D.Double(x - 2.7, y - 2.7, 5.4, 5.4));
            }
        }
        // Headline, as on the draft.
        Font big = tracked(font("InterDisplay-Bold", 104f), -0.03f);
        c.text("Head-turning", 96, 470, big, Color.WHITE);
        c.text("live-action", 96, 580, big, CYAN);
        c.text("video", 96, 690, big, CYAN);
        Font body = font("Inter-Regular", 20f);
        c.text("Video, animation and photography that makes", 98, 760, body, white(220));
        c.text("people stop, look, and remember your brand.", 98, 790, body, white(220));
        return c.img;
    }

    static BufferedImage boxBlur(BufferedImage src, int r, int passes) {
        int w = src.getWidth(), h = src.getHeight();
        int[] a = src.getRGB(0, 0, w, h, null, 0, w), b = new int[a.length];
        for (int p = 0; p < passes; p++) {
            blurLine(a, b, w, h, r, true);
            blurLine(b, a, w, h, r, false);
        }
        BufferedImage out = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        out.setRGB(0, 0, w, h, a, 0, w);
        return out;
    }
    static void blurLine(int[] in, int[] out, int w, int h, int r, boolean horiz) {
        int lines = horiz ? h : w, len = horiz ? w : h;
        for (int l = 0; l < lines; l++) {
            long sr = 0, sg = 0, sb = 0;
            for (int i = -r; i <= r; i++) {
                int px = in[idx(l, Math.max(0, Math.min(len - 1, i)), w, horiz)];
                sr += (px >> 16) & 255; sg += (px >> 8) & 255; sb += px & 255;
            }
            int n = 2 * r + 1;
            for (int i = 0; i < len; i++) {
                out[idx(l, i, w, horiz)] = (int) (sr / n) << 16 | (int) (sg / n) << 8 | (int) (sb / n);
                int add = in[idx(l, Math.min(len - 1, i + r + 1), w, horiz)];
                int rem = in[idx(l, Math.max(0, i - r), w, horiz)];
                sr += ((add >> 16) & 255) - ((rem >> 16) & 255);
                sg += ((add >> 8) & 255) - ((rem >> 8) & 255);
                sb += (add & 255) - (rem & 255);
            }
        }
    }
    static int idx(int line, int i, int w, boolean horiz) { return horiz ? line * w + i : i * w + line; }

    // ---------- nav bar ----------
    static final String[] NAV = {"About us", "Services", "Portfolio", "Sectors", "Case Studies", "Blog"};
    static final Set<String> HAS_MENU = Set.of("About us", "Services", "Portfolio", "Sectors");
    static final double NAV_H = 88, NAV_Y = 50;

    /** Draws logo, links and contact button; returns the x-range of each link. */
    static Map<String, double[]> nav(Canvas c, String active, boolean underline) {
        // logo
        c.g.setPaint(new RadialGradientPaint(new Point2D.Double(78, 44), 19, new float[]{0f, 0.55f, 1f},
                new Color[]{new Color(0xBFF6FF), new Color(0x2FC8FF), new Color(0x1C5BFF)}));
        c.g.fill(new Ellipse2D.Double(60, 26, 36, 36));
        c.fill(new Ellipse2D.Double(70, 36, 16, 16), new Color(0x0B3A88));
        c.fill(new Ellipse2D.Double(75, 41, 6, 6), new Color(0xBFF6FF));
        c.text("pearldrop", 106, 53, tracked(font("Inter-SemiBold", 25f), -0.02f), Color.WHITE);

        Font cta = font("Inter-SemiBold", 16f);
        double bw = c.width("Contact", cta) + 22 + 48, bx = 1376 - bw;
        c.fill(rr(bx, 44 - 24, bw, 48, 24), Color.WHITE);
        c.text("Contact", bx + 24, NAV_Y, cta, INK);
        arrow(c, bx + bw - 24 - 13, 44, 13, INK, 1.8f);

        Font f = font("Inter-Medium", 16f);
        Map<String, double[]> pos = new LinkedHashMap<>();
        double x = bx - 44;
        for (int i = NAV.length - 1; i >= 0; i--) {
            String s = NAV[i];
            double w = c.width(s, f) + (HAS_MENU.contains(s) ? 18 : 0);
            x -= w;
            pos.put(s, new double[]{x, w});
            x -= 34;
        }
        for (String s : NAV) {
            double[] p = pos.get(s);
            boolean on = s.equals(active);
            Color col = on ? Color.WHITE : white(active == null ? 230 : 175);
            c.text(s, p[0], NAV_Y, f, col);
            if (HAS_MENU.contains(s)) chevron(c, p[0] + p[1] - 5, 44, on, col);
            if (on && underline) c.fill(rr(p[0], 66, p[1], 2.5, 1.25), CYAN);
        }
        return pos;
    }

    static Canvas base(BufferedImage bg, BufferedImage blur, int scrim) {
        Canvas c = new Canvas();
        c.bg = bg; c.blur = blur;
        c.g.drawImage(bg, 0, 0, W, H, null);
        c.fill(new Rectangle2D.Double(0, 0, W, H), new Color(2, 8, 20, scrim));
        // keep the nav legible over the hero
        c.g.setPaint(new GradientPaint(0, 0, new Color(3, 10, 24, 150), 0, 120, new Color(3, 10, 24, 0)));
        c.g.fillRect(0, 0, W, 120);
        return c;
    }

    // ---------- shared content ----------
    static final List<String> COMPANY = List.of("Meet Pearldrop", "Our values", "Our showreels", "Our clients",
            "Testimonials", "Memberships & accreditations", "Behind the scenes");
    static final List<String> WORKING = List.of("How we work", "Why Pearldrop?", "Why video?", "Sustainability", "FAQ");
    static final List<String> CAREERS = List.of("Careers", "Work experience");

    static void hoverRow(Canvas c, double x, double y, double w, double h) {
        c.fill(rr(x, y, w, h, 8), white(14));
    }

    // =====================================================================
    // A — compact dropdown anchored to the trigger
    // =====================================================================
    static Canvas conceptA(BufferedImage bg, BufferedImage blur) {
        Canvas c = base(bg, blur, 90);
        Map<String, double[]> pos = nav(c, "About us", false);
        double[] t = pos.get("About us");
        double px = t[0] - 28, py = 82, pw = 600, ph = 438;

        Path2D notch = new Path2D.Double();
        double nx = t[0] + t[1] / 2;
        notch.moveTo(nx - 9, py + 1); notch.lineTo(nx, py - 8); notch.lineTo(nx + 9, py + 1); notch.closePath();
        Area shape = new Area(rr(px, py, pw, ph, 18));
        shape.add(new Area(notch));
        c.g.setColor(new Color(0, 0, 0, 50));
        c.g.fill(rr(px - 2, py + 6, pw + 4, ph + 6, 20)); // soft drop shadow
        c.glass(shape, PANEL);
        c.stroke(shape, white(26), 1f);

        Font lf = label(), item = font("Inter-Regular", 15f);
        double cx1 = px + 28, cx2 = px + 312, top = py + 40, lh = 38;

        c.text("THE COMPANY", cx1 + 12, top, lf, CYAN_DIM);
        for (int i = 0; i < COMPANY.size(); i++) {
            double y = top + 32 + i * lh;
            boolean hover = i == 2;
            if (hover) {
                hoverRow(c, cx1, y - 24, 260, 36);
                arrow(c, cx1 + 232, y - 6, 12, CYAN, 1.6f);
            }
            c.text(COMPANY.get(i), cx1 + 12, y, item, hover ? Color.WHITE : white(205));
        }

        c.text("WORKING WITH US", cx2 + 12, top, lf, CYAN_DIM);
        for (int i = 0; i < WORKING.size(); i++)
            c.text(WORKING.get(i), cx2 + 12, top + 32 + i * lh, item, white(205));
        double ct = top + 32 + WORKING.size() * lh + 14;
        c.text("JOIN US", cx2 + 12, ct, lf, CYAN_DIM);
        c.text("Careers", cx2 + 12, ct + 32, item, white(205));
        c.text("Work experience", cx2 + 12, ct + 32 + lh, item, white(205));

        // footer strip
        double fy = py + ph - 62;
        c.fill(new Rectangle2D.Double(px + 1, fy, pw - 2, 1), LINE);
        c.fill(rr(px + 1, fy + 1, pw - 2, 60, 0), white(6));
        c.fill(new Ellipse2D.Double(cx1 + 10, fy + 15, 30, 30), CYAN);
        icon(c, "play", cx1 + 25.5, fy + 30, INK);
        c.text("Watch the showreel", cx1 + 52, fy + 36, font("Inter-SemiBold", 15f), Color.WHITE);
        Font tag = font("Inter-Italic", 13f);
        String ts = "Since 2003. Still can't sit still.";
        c.text(ts, px + pw - 28 - c.width(ts, tag), fy + 36, tag, white(120));
        return c;
    }

    // =====================================================================
    // B — full-width mega panel with a showreel feature card
    // =====================================================================
    static Canvas conceptB(BufferedImage bg, BufferedImage blur) {
        Canvas c = base(bg, blur, 120);
        double ph = 400;
        c.glass(new Rectangle2D.Double(0, 0, W, ph), new Color(6, 16, 36, 225));
        c.fill(new Rectangle2D.Double(0, ph, W, 1), white(30));
        c.fill(new Rectangle2D.Double(64, NAV_H, W - 128, 1), LINE);
        nav(c, "About us", true);

        // feature card
        double fx = 64, fy = NAV_H + 32, fw = 336, fh = 196;
        Shape card = rr(fx, fy, fw, fh, 14);
        Shape old = c.g.getClip();
        c.g.clip(card);
        // crop of the sequin figure as the "thumbnail"
        c.g.drawImage(c.bg, (int) fx, (int) fy, (int) (fx + fw), (int) (fy + fh),
                880 * S, 300 * S, 1340 * S, 568 * S, null);
        c.g.setPaint(new GradientPaint(0, (float) fy + 60, new Color(0, 0, 0, 0), 0, (float) (fy + fh), new Color(2, 8, 20, 200)));
        c.g.fill(card);
        c.g.setClip(old);
        c.stroke(card, white(30), 1f);
        c.fill(new Ellipse2D.Double(fx + fw / 2 - 28, fy + fh / 2 - 34, 56, 56), white(235));
        icon(c, "play", fx + fw / 2 + 2, fy + fh / 2 - 6, INK);
        c.text("Showreel 2026", fx + 18, fy + fh - 20, font("Inter-SemiBold", 16f), Color.WHITE);
        Font small = font("Inter-Regular", 13f);
        c.text("Live-action · Animation · Photography", fx, fy + fh + 26, small, white(150));

        // three columns
        Font lf = label(), item = font("Inter-Medium", 15f);
        double[] cols = {470, 790, 1110};
        String[] heads = {"THE COMPANY", "WORKING WITH US", "CAREERS"};
        List<List<String>> lists = List.of(COMPANY, WORKING, CAREERS);
        double top = NAV_H + 46;
        for (int k = 0; k < 3; k++) {
            c.text(heads[k], cols[k], top, lf, CYAN_DIM);
            List<String> l = lists.get(k);
            for (int i = 0; i < l.size(); i++) {
                double y = top + 34 + i * 33;
                boolean hover = k == 1 && i == 0;
                c.text(l.get(i), cols[k], y, item, hover ? CYAN : white(215));
                if (hover) arrow(c, cols[k] + c.width(l.get(i), item) + 10, y - 5, 12, CYAN, 1.6f);
            }
            if (k > 0) c.fill(new Rectangle2D.Double(cols[k] - 40, top - 14, 1, 250), LINE);
        }
        // careers column: a small promo under the links
        double py = top + 34 + 2 * 33 + 16;
        Shape promo = rr(cols[2], py, 266, 92, 12);
        c.fill(promo, cyan(18));
        c.stroke(promo, cyan(60), 1f);
        c.text("Join the team", cols[2] + 18, py + 32, font("Inter-SemiBold", 15f), Color.WHITE);
        c.text("Open roles, placements and", cols[2] + 18, py + 54, small, white(170));
        c.text("work experience →", cols[2] + 18, py + 73, small, white(170));

        // bottom row
        Font tiny = font("Inter-Regular", 12.5f);
        c.text("Since 2003. Still can't sit still.", 64, ph - 26, font("Inter-Italic", 12.5f), white(110));
        String legal = "Terms of Service     Privacy Policy";
        c.text(legal, W - 64 - c.width(legal, tiny), ph - 26, tiny, white(110));
        return c;
    }

    // =====================================================================
    // C — icon tiles for the six key pages, chips for the rest
    // =====================================================================
    static Canvas conceptC(BufferedImage bg, BufferedImage blur) {
        Canvas c = base(bg, blur, 100);
        Map<String, double[]> pos = nav(c, "About us", true);
        double[] t = pos.get("About us");
        double pw = 800, px = Math.min(t[0] - 40, W - 64 - pw), py = 86, ph = 360;

        c.g.setColor(new Color(0, 0, 0, 50));
        c.g.fill(rr(px - 2, py + 6, pw + 4, ph + 6, 22));
        Shape panel = rr(px, py, pw, ph, 20);
        c.glass(panel, PANEL);
        c.stroke(panel, white(26), 1f);

        String[][] tiles = {
                {"people", "Meet Pearldrop", "Who we are, since 2003"},
                {"play", "Our showreels", "Our best work, cut short"},
                {"star", "Clients & testimonials", "Who we've made work for"},
                {"path", "How we work", "From first call to final cut"},
                {"lens", "Why video?", "What moving image can do"},
                {"briefcase", "Careers", "Jobs and work experience"},
        };
        double gx = px + 16, gy = py + 16, tw = (pw - 32) / 3, th = 88;
        Font title = font("Inter-SemiBold", 15f), desc = font("Inter-Regular", 13f);
        for (int i = 0; i < tiles.length; i++) {
            double x = gx + (i % 3) * tw, y = gy + (i / 3) * th;
            boolean hover = i == 1;
            if (hover) {
                Shape h = rr(x + 2, y + 2, tw - 4, th - 4, 14);
                c.fill(h, white(12));
                c.stroke(h, cyan(70), 1f);
            }
            Shape box = rr(x + 16, y + 20, 40, 40, 11);
            c.fill(box, hover ? CYAN : cyan(28));
            icon(c, tiles[i][0], x + 36, y + 40, hover ? INK : CYAN);
            c.text(tiles[i][1], x + 70, y + 37, title, Color.WHITE);
            c.text(tiles[i][2], x + 70, y + 57, desc, white(150));
        }

        double dy = gy + 2 * th + 18;
        c.fill(new Rectangle2D.Double(px + 34, dy, pw - 68, 1), LINE);
        c.text("MORE ABOUT US", px + 34, dy + 34, label(), CYAN_DIM);
        String[] chips = {"Our values", "Why Pearldrop?", "Behind the scenes", "Memberships & accreditations",
                "Sustainability", "FAQ"};
        Font cf = font("Inter-Medium", 13.5f);
        double x = px + 34, y = dy + 50;
        for (String s : chips) {
            double w = c.width(s, cf) + 28;
            if (x + w > px + pw - 34) { x = px + 34; y += 44; }
            Shape chip = rr(x, y, w, 34, 17);
            c.fill(chip, white(8));
            c.stroke(chip, white(34), 1f);
            c.text(s, x + 14, y + 22, cf, white(215));
            x += w + 10;
        }
        return c;
    }

    // =====================================================================
    // D — editorial overlay: statement on the left, big type links on the right
    // =====================================================================
    static Canvas conceptD(BufferedImage bg, BufferedImage blur) {
        Canvas c = base(bg, blur, 150);
        double ph = 600;
        c.glass(new Rectangle2D.Double(0, 0, W, ph), new Color(5, 13, 30, 244));
        c.fill(new Rectangle2D.Double(0, ph - 3, W, 3), CYAN);
        nav(c, "About us", true);

        // left: statement and testimonial
        c.text("ABOUT US", 64, 156, label(), CYAN_DIM);
        Font disp = tracked(font("InterDisplay-SemiBold", 46f), -0.02f);
        c.text("Since 2003.", 64, 214, disp, Color.WHITE);
        c.text("Still can't", 64, 268, disp, Color.WHITE);
        c.text("sit still.", 64, 322, disp, CYAN);

        Shape q = rr(64, 366, 400, 166, 16);
        c.fill(q, white(8));
        c.stroke(q, white(26), 1f);
        c.text("“", 84, 420, font("InterDisplay-Bold", 52f), CYAN);
        Font qf = font("Inter-Regular", 15.5f);
        c.text("We LOVE Pearldrop! They have produced", 88, 432, qf, white(225));
        c.text("some incredible content for us and we", 88, 455, qf, white(225));
        c.text("would highly recommend them!", 88, 478, qf, white(225));
        c.fill(new Rectangle2D.Double(88, 506, 22, 2), CYAN);
        c.text("Head of Marketing, National Retail Brand", 120, 511, font("Inter-SemiBold", 12.5f), CYAN_DIM);

        c.fill(new Rectangle2D.Double(540, 130, 1, 410), LINE);

        // middle: primary destinations in display type
        String[] primary = {"Meet Pearldrop", "Our showreels", "Our clients", "How we work", "Why video?", "Careers"};
        Font pf = tracked(font("InterDisplay-Medium", 30f), -0.015f), num = font("Inter-Medium", 12f);
        for (int i = 0; i < primary.length; i++) {
            double y = 176 + i * 64;
            boolean hover = i == 1;
            c.text(String.format("%02d", i + 1), 600, y - 12, num, hover ? CYAN : white(90));
            c.text(primary[i], 640, y, pf, hover ? CYAN : Color.WHITE);
            if (hover) arrow(c, 640 + c.width(primary[i], pf) + 16, y - 10, 22, CYAN, 2f);
            if (i < primary.length - 1) c.fill(new Rectangle2D.Double(600, y + 24, 400, 1), white(14));
        }

        // right: secondary links
        Font lf = label(), sf = font("Inter-Regular", 14.5f);
        double rx = 1100;
        c.text("MORE ABOUT US", rx, 156, lf, CYAN_DIM);
        String[] more = {"Our values", "Testimonials", "Memberships & accreditations", "Behind the scenes"};
        for (int i = 0; i < more.length; i++) c.text(more[i], rx, 190 + i * 32, sf, white(200));
        c.text("GOOD TO KNOW", rx, 344, lf, CYAN_DIM);
        String[] know = {"Why Pearldrop?", "Sustainability", "FAQ", "Work experience"};
        for (int i = 0; i < know.length; i++) c.text(know[i], rx, 378 + i * 32, sf, white(200));
        Font tiny = font("Inter-Regular", 12f);
        c.text("Terms of Service     Privacy Policy", rx, 548, tiny, white(100));
        return c;
    }

    // =====================================================================
    // E — mobile: top-level list, then drill into About us
    // =====================================================================
    static Canvas conceptE(BufferedImage bg) {
        Canvas c = new Canvas();
        c.g.setPaint(new GradientPaint(0, 0, new Color(0x0A1A33), W, H, new Color(0x030812)));
        c.g.fillRect(0, 0, W, H);

        Font h = tracked(font("InterDisplay-SemiBold", 40f), -0.02f), b = font("Inter-Regular", 17f);
        c.text("On a phone,", 96, 330, h, Color.WHITE);
        c.text("drill in, don't stack.", 96, 380, h, CYAN);
        String[] lines = {"Top level stays short: six links and a", "contact button. Tapping About us slides",
                "in one focused list with the same groups", "as desktop, and the showreel up top."};
        for (int i = 0; i < lines.length; i++) c.text(lines[i], 98, 430 + i * 28, b, white(185));

        phone(c, bg, 620, false);
        phone(c, bg, 1010, true);
        return c;
    }

    static void phone(Canvas c, BufferedImage bg, double x, boolean drilled) {
        double y = 60, w = 360, hh = 780;
        Shape outer = rr(x - 10, y - 10, w + 20, hh + 20, 54);
        c.fill(outer, new Color(0x1A2333));
        c.stroke(outer, white(40), 1.2f);
        Shape screen = rr(x, y, w, hh, 46);
        Shape old = c.g.getClip();
        c.g.clip(screen);
        c.fill(screen, new Color(0x06122A));
        Graphics2D g = c.g;

        // status bar + notch
        c.text("9:41", x + 34, y + 34, font("Inter-SemiBold", 14f), Color.WHITE);
        c.fill(rr(x + w / 2 - 58, y + 12, 116, 32, 16), Color.BLACK);
        c.fill(rr(x + w - 62, y + 24, 26, 12, 3), white(220));

        // header
        double hy = y + 82;
        g.setPaint(new RadialGradientPaint(new Point2D.Double(x + 38, hy), 15, new float[]{0f, 0.55f, 1f},
                new Color[]{new Color(0xBFF6FF), new Color(0x2FC8FF), new Color(0x1C5BFF)}));
        g.fill(new Ellipse2D.Double(x + 24, hy - 14, 28, 28));
        c.fill(new Ellipse2D.Double(x + 32, hy - 6, 12, 12), new Color(0x0B3A88));
        c.text("pearldrop", x + 60, hy + 7, tracked(font("Inter-SemiBold", 20f), -0.02f), Color.WHITE);
        // close icon
        c.stroke(new Line2D.Double(x + w - 40, hy - 8, x + w - 24, hy + 8), Color.WHITE, 2f);
        c.stroke(new Line2D.Double(x + w - 40, hy + 8, x + w - 24, hy - 8), Color.WHITE, 2f);

        if (!drilled) {
            Font big = tracked(font("InterDisplay-SemiBold", 30f), -0.015f);
            String[] items = {"About us", "Services", "Portfolio", "Sectors", "Case Studies", "Blog"};
            for (int i = 0; i < items.length; i++) {
                double iy = y + 182 + i * 66;
                boolean on = i == 0;
                c.text(items[i], x + 28, iy, big, on ? CYAN : Color.WHITE);
                if (HAS_MENU.contains(items[i])) {
                    Path2D p = new Path2D.Double();
                    p.moveTo(x + w - 38, iy - 18); p.lineTo(x + w - 31, iy - 11); p.lineTo(x + w - 38, iy - 4);
                    c.stroke(p, on ? CYAN : white(150), 2f);
                }
                c.fill(new Rectangle2D.Double(x + 28, iy + 22, w - 56, 1), white(18));
            }
            Shape btn = rr(x + 28, y + hh - 132, w - 56, 56, 28);
            c.fill(btn, Color.WHITE);
            Font bf = font("Inter-SemiBold", 17f);
            double tw = c.width("Contact us", bf);
            c.text("Contact us", x + w / 2 - tw / 2 - 10, y + hh - 98, bf, INK);
            arrow(c, x + w / 2 + tw / 2 - 2, y + hh - 104, 14, INK, 2f);
        } else {
            // back row
            double by = y + 140;
            Path2D p = new Path2D.Double();
            p.moveTo(x + 36, by - 13); p.lineTo(x + 29, by - 6); p.lineTo(x + 36, by + 1);
            c.stroke(p, CYAN, 2f);
            c.text("Menu", x + 46, by, font("Inter-Medium", 15f), CYAN);
            c.text("About us", x + 28, by + 50, tracked(font("InterDisplay-SemiBold", 30f), -0.015f), Color.WHITE);

            // showreel strip
            double sy = by + 74;
            Shape card = rr(x + 28, sy, w - 56, 84, 14);
            Shape o2 = c.g.getClip();
            c.g.clip(card);
            g.drawImage(bg, (int) (x + 28), (int) sy, (int) (x + w - 28), (int) (sy + 84),
                    900 * S, 360 * S, 1300 * S, 470 * S, null);
            c.fill(card, new Color(2, 8, 20, 120));
            c.g.setClip(o2);
            c.g.clip(screen);
            c.fill(new Ellipse2D.Double(x + 46, sy + 24, 36, 36), Color.WHITE);
            icon(c, "play", x + 65, sy + 42, INK);
            c.text("Watch the showreel", x + 96, sy + 48, font("Inter-SemiBold", 16f), Color.WHITE);

            Font lf = label(), it = font("Inter-Regular", 16.5f);
            double gy = sy + 124;
            String[][] groups = {
                    {"THE COMPANY", "Meet Pearldrop", "Our values", "Our clients", "Testimonials", "Behind the scenes"},
                    {"WORKING WITH US", "How we work", "Why video?", "Sustainability", "FAQ"},
            };
            for (String[] grp : groups) {
                c.text(grp[0], x + 28, gy, lf, CYAN_DIM);
                gy += 12;
                for (int i = 1; i < grp.length; i++) {
                    gy += 34;
                    c.text(grp[i], x + 28, gy, it, white(220));
                }
                gy += 40;
            }
        }
        c.g.setClip(old);
        // home indicator
        c.fill(rr(x + w / 2 - 66, y + hh - 16, 132, 5, 2.5), white(200));
    }

    // =====================================================================
    // SERVICES — the busiest menu (15 / 2 / 5 / 5 items)
    // =====================================================================
    record Discipline(String name, String icon, String tagline, String[][] groups) {
        int count() { int n = 0; for (String[] g : groups) n += g.length - 1; return n; }
    }
    // Live-action's 15 items regrouped so the column stops being a wall.
    static final List<Discipline> SERVICES = List.of(
            new Discipline("Live-action video", "clapper", "Real people, real places, real good.", new String[][]{
                    {"Formats", "Company profiles", "Promotional", "Product", "Training", "Internal communications",
                            "Landing pages", "Case studies", "Vodcasts"},
                    {"Events", "Activations & launches", "Conferences & ceremonies", "Live events", "Live-streaming"},
                    {"Specialist", "Aerial / drone", "Automotive", "Charity"}}),
            new Discipline("Animation", "anim", "For when reality needs a rewrite.", new String[][]{
                    {"", "Explainer", "Character"}}),
            new Discipline("Photography", "camera", "Stills that stop the scroll.", new String[][]{
                    {"", "Architectural", "Automotive", "Headshots", "Lifestyle", "Live-event"}}),
            new Discipline("Post-production", "wave", "Where it all comes together.", new String[][]{
                    {"", "Editing", "VFX", "Subtitling & transcription", "British Sign Language (BSL)", "AI video production"}}));

    static void icon2(Canvas c, String name, double cx, double cy, Color col) {
        float w = 1.6f;
        switch (name) {
            case "clapper" -> {
                c.stroke(rr(cx - 8, cy - 3, 16, 11, 2), col, w);
                Path2D p = new Path2D.Double();
                p.moveTo(cx - 8, cy - 4); p.lineTo(cx + 7, cy - 9);
                p.moveTo(cx - 3, cy - 5.6); p.lineTo(cx - 1, cy - 2);
                p.moveTo(cx + 2, cy - 7.3); p.lineTo(cx + 4, cy - 3.6);
                c.stroke(p, col, w);
            }
            case "anim" -> {
                c.stroke(new Ellipse2D.Double(cx - 1, cy - 6, 10, 10), col, w);
                c.stroke(new Line2D.Double(cx - 9, cy - 3, cx - 4, cy - 3), col, w);
                c.stroke(new Line2D.Double(cx - 8, cy + 1, cx - 3, cy + 1), col, w);
                c.stroke(new Line2D.Double(cx - 6, cy + 5, cx - 2, cy + 5), col, w);
            }
            case "camera" -> {
                c.stroke(rr(cx - 9, cy - 5, 18, 13, 3), col, w);
                c.stroke(new Ellipse2D.Double(cx - 3.5, cy - 2, 7, 7), col, w);
                c.stroke(new Line2D.Double(cx - 4, cy - 7.5, cx + 2, cy - 7.5), col, w);
            }
            case "wave" -> {
                double[] hs = {4, 9, 14, 8, 11, 5};
                for (int i = 0; i < hs.length; i++)
                    c.stroke(new Line2D.Double(cx - 7.5 + i * 3, cy - hs[i] / 2, cx - 7.5 + i * 3, cy + hs[i] / 2), col, w);
            }
            default -> icon(c, name, cx, cy, col);
        }
    }

    static void clipped(Canvas c, Shape s, Runnable r) {
        Shape old = c.g.getClip();
        c.g.clip(s);
        r.run();
        c.g.setClip(old);
    }

    /** Procedural artwork per discipline, filling the given box. */
    static double artFocus = 0.5;

    static void art(Canvas c, String kind, double x, double y, double w, double h) {
        Graphics2D g = c.g;
        switch (kind) {
            case "clapper" -> {
                double sh = Math.min(560, 640 * h / w), sw = sh * w / h;
                double sx = 1110 - sw / 2, sy = 600 - sh / 2;
                g.drawImage(c.bg, (int) x, (int) y, (int) (x + w), (int) (y + h),
                        (int) (sx * S), (int) (sy * S), (int) ((sx + sw) * S), (int) ((sy + sh) * S), null);
                g.setPaint(new RadialGradientPaint(new Point2D.Double(x + w * 0.65, y + h * 0.3), (float) Math.max(w, h) * 0.7f,
                        new float[]{0f, 1f}, new Color[]{new Color(80, 170, 255, 70), new Color(80, 170, 255, 0)}));
                g.fill(new Rectangle2D.Double(x, y, w, h));
            }
            case "anim" -> {
                g.setPaint(new GradientPaint((float) x, (float) y, new Color(0x241A66), (float) (x + w), (float) (y + h), new Color(0x0B2150)));
                g.fill(new Rectangle2D.Double(x, y, w, h));
                double u = Math.min(w, h);
                // rotated square
                AffineTransform at = g.getTransform();
                g.rotate(Math.toRadians(18), x + w * 0.8, y + h * 0.25);
                c.fill(rr(x + w * 0.8 - u * 0.14, y + h * 0.25 - u * 0.14, u * 0.28, u * 0.28, u * 0.06), new Color(138, 123, 255, 150));
                g.setTransform(at);
                // motion path with onion-skinned ball
                CubicCurve2D.Double path = new CubicCurve2D.Double(x + w * 0.08, y + h * 0.85, x + w * 0.3, y + h * 0.05,
                        x + w * 0.5, y + h * 0.95, x + w * 0.78, y + h * 0.55);
                g.setColor(cyan(110));
                g.setStroke(new BasicStroke(1.4f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND, 1f, new float[]{4f, 5f}, 0f));
                g.draw(path);
                double r = u * 0.075;
                for (int i = 0; i <= 6; i++) {
                    double t = i / 6.0, mt = 1 - t;
                    double px = mt * mt * mt * path.x1 + 3 * mt * mt * t * path.ctrlx1 + 3 * mt * t * t * path.ctrlx2 + t * t * t * path.x2;
                    double py = mt * mt * mt * path.y1 + 3 * mt * mt * t * path.ctrly1 + 3 * mt * t * t * path.ctrly2 + t * t * t * path.y2;
                    if (i == 6) {
                        c.fill(new Ellipse2D.Double(px - r * 2, py - r * 2, r * 4, r * 4), cyan(40));
                        c.fill(new Ellipse2D.Double(px - r, py - r, r * 2, r * 2), CYAN);
                    } else {
                        c.stroke(new Ellipse2D.Double(px - r * 0.8, py - r * 0.8, r * 1.6, r * 1.6), cyan(40 + i * 25), 1.2f);
                    }
                    if (i % 3 == 0) {
                        Path2D d = new Path2D.Double();
                        d.moveTo(px, py + r * 2.2 - 4); d.lineTo(px + 4, py + r * 2.2); d.lineTo(px, py + r * 2.2 + 4); d.lineTo(px - 4, py + r * 2.2); d.closePath();
                        c.fill(d, new Color(0xFFD36E));
                    }
                }
            }
            case "camera" -> {
                g.setPaint(new GradientPaint((float) x, (float) y, new Color(0x0D3A4A), (float) x, (float) (y + h), new Color(0x061A2B)));
                g.fill(new Rectangle2D.Double(x, y, w, h));
                double cx = x + w / 2, cy = y + h / 2, R = Math.min(w, h) * 0.32;
                c.fill(new Ellipse2D.Double(cx - R, cy - R, 2 * R, 2 * R), new Color(4, 14, 26, 200));
                c.stroke(new Ellipse2D.Double(cx - R, cy - R, 2 * R, 2 * R), cyan(120), 1.4f);
                c.stroke(new Ellipse2D.Double(cx - R * 1.18, cy - R * 1.18, R * 2.36, R * 2.36), white(30), 1f);
                double rin = R * 0.42;
                Path2D hex = new Path2D.Double();
                for (int i = 0; i < 6; i++) {
                    double a = Math.PI / 6 + i * Math.PI / 3;
                    double hx = cx + rin * Math.cos(a), hy = cy + rin * Math.sin(a);
                    if (i == 0) hex.moveTo(hx, hy); else hex.lineTo(hx, hy);
                    // blade edge running out to the rim
                    double b = a + Math.PI / 2;
                    double t = Math.sqrt(R * R - rin * rin);
                    c.stroke(new Line2D.Double(hx, hy, hx + t * Math.cos(b), hy + t * Math.sin(b)), cyan(90), 1.2f);
                }
                hex.closePath();
                g.setPaint(new RadialGradientPaint(new Point2D.Double(cx - rin * 0.3, cy - rin * 0.3), (float) rin,
                        new float[]{0f, 1f}, new Color[]{new Color(0x9FF0FF), new Color(0x1C6E9A)}));
                g.fill(hex);
                double in = Math.min(w, h) * 0.08, L = Math.min(w, h) * 0.08;
                double[][] corners = {{x + in, y + in, 1, 1}, {x + w - in, y + in, -1, 1}, {x + in, y + h - in, 1, -1}, {x + w - in, y + h - in, -1, -1}};
                for (double[] k : corners) {
                    Path2D p = new Path2D.Double();
                    p.moveTo(k[0], k[1] + L * k[3]); p.lineTo(k[0], k[1]); p.lineTo(k[0] + L * k[2], k[1]);
                    c.stroke(p, white(170), 1.6f);
                }
                c.text("f/2.8   1/250   ISO 200", x + in + 4, y + h - in - 8, font("Inter-Medium", 10.5f), white(150));
            }
            case "wave" -> {
                g.setPaint(new GradientPaint((float) x, (float) y, new Color(0x10224A), (float) x, (float) (y + h), new Color(0x081530)));
                g.fill(new Rectangle2D.Double(x, y, w, h));
                Color[] cols = {new Color(47, 216, 255, 170), new Color(58, 123, 255, 190), new Color(138, 123, 255, 170), new Color(40, 190, 170, 160)};
                double th = h * 0.11, ty = y + h * 0.18;
                for (int row = 0; row < 4; row++) {
                    double cx = x + 10 - row * 23 % 40, yy = ty + row * (th + 6);
                    int k = 0;
                    while (cx < x + w) {
                        double cw = 30 + hash(row, k) * w * 0.35;
                        c.fill(rr(cx, yy, cw - 4, th, 3), cols[(row + k) % 4]);
                        cx += cw + 2; k++;
                    }
                }
                double wy = ty + 4 * (th + 6) + h * 0.12, mid = wy + h * 0.08;
                for (double bx = x + 6; bx < x + w - 4; bx += 4) {
                    double a = Math.abs(Math.sin(bx * 0.09) * Math.cos(bx * 0.023)) * h * 0.08 + 1.5;
                    c.fill(new Rectangle2D.Double(bx, mid - a, 2, a * 2), white(110));
                }
                double ph = x + w * 0.62;
                c.fill(new Rectangle2D.Double(ph - 0.75, y + h * 0.1, 1.5, h * 0.82), CYAN);
                Path2D tri = new Path2D.Double();
                tri.moveTo(ph - 6, y + h * 0.1 - 8); tri.lineTo(ph + 6, y + h * 0.1 - 8); tri.lineTo(ph, y + h * 0.1); tri.closePath();
                c.fill(tri, CYAN);
            }
            case "people" -> {
                g.setPaint(new GradientPaint((float) x, (float) y, new Color(0x0C2B5C), (float) x, (float) (y + h), new Color(0x06142E)));
                g.fill(new Rectangle2D.Double(x, y, w, h));
                double u = Math.min(w, h), cx = x + w * artFocus, cy = y + h * 0.46, r = u * 0.135;
                Font yr = font("InterDisplay-Bold", (float) (u * 0.42));
                c.text("2003", x + w - c.width("2003", yr) - 12, y + h - 10, yr, white(14));
                g.setPaint(new RadialGradientPaint(new Point2D.Double(cx, cy), (float) (r * 3), new float[]{0f, 1f},
                        new Color[]{cyan(70), cyan(0)}));
                g.fill(new Ellipse2D.Double(cx - r * 3, cy - r * 3, r * 6, r * 6));
                for (int i = 1; i <= 5; i++) {
                    double rr2 = r * (1 + 0.6 * i);
                    c.stroke(new Ellipse2D.Double(cx - rr2, cy - rr2, rr2 * 2, rr2 * 2), cyan(110 - 18 * i), 1.2f);
                }
                g.setPaint(new RadialGradientPaint(new Point2D.Double(cx - r * 0.3, cy - r * 0.3), (float) (r * 1.3), new float[]{0f, 0.55f, 1f},
                        new Color[]{new Color(0xBFF6FF), new Color(0x2FC8FF), new Color(0x1C5BFF)}));
                g.fill(new Ellipse2D.Double(cx - r, cy - r, r * 2, r * 2));
                c.fill(new Ellipse2D.Double(cx - r * 0.45, cy - r * 0.45, r * 0.9, r * 0.9), new Color(0x0B3A88));
                c.fill(new Ellipse2D.Double(cx - r * 0.17, cy - r * 0.17, r * 0.34, r * 0.34), new Color(0xBFF6FF));
            }
            case "play" -> {
                g.setPaint(new GradientPaint((float) x, (float) y, new Color(0x0A1C40), (float) x, (float) (y + h), new Color(0x050E22)));
                g.fill(new Rectangle2D.Double(x, y, w, h));
                boolean tall = h > w * 1.3;
                double cx = x + w * artFocus, cy = y + h * 0.48;
                double sh = Math.min(tall ? w * 0.62 : h * 0.6, 170), len = 2 * Math.max(w, h);
                AffineTransform at = g.getTransform();
                g.rotate(Math.toRadians(tall ? -78 : -8), cx, cy);
                double sx = cx - len / 2, sy = cy - sh / 2;
                c.fill(new Rectangle2D.Double(sx, sy, len, sh), new Color(0x02060F));
                double hole = sh * 0.09;
                for (double hx = sx + 4; hx < sx + len; hx += hole * 2.2) {
                    c.fill(rr(hx, sy + hole * 0.6, hole * 1.2, hole, hole * 0.25), white(150));
                    c.fill(rr(hx, sy + sh - hole * 1.6, hole * 1.2, hole, hole * 0.25), white(150));
                }
                double fh = sh * 0.66, fw = fh * 1.5, fy = cy - fh / 2;
                Color[] tints = {cyan(60), new Color(138, 123, 255, 80), new Color(0, 0, 0, 0), new Color(40, 190, 170, 70)};
                int k = 0;
                for (double fx = cx - fw * 0.5 - (fw + 6) * Math.ceil(len / 2 / (fw + 6)); fx < sx + len; fx += fw + 6, k++) {
                    Shape fr = new Rectangle2D.Double(fx, fy, fw, fh);
                    final int kk = Math.floorMod(k, 4);
                    final double ffx = fx;
                    clipped(c, fr, () -> {
                        int ox = 860 + kk * 90;
                        g.drawImage(c.bg, (int) ffx, (int) fy, (int) (ffx + fw), (int) (fy + fh),
                                ox * S, (360 + kk * 60) * S, (ox + 270) * S, (540 + kk * 60) * S, null);
                        c.fill(fr, tints[kk]);
                    });
                }
                g.setTransform(at);
            }
            case "path" -> {
                g.setPaint(new GradientPaint((float) x, (float) y, new Color(0x0B3346), (float) x, (float) (y + h), new Color(0x061A2E)));
                g.fill(new Rectangle2D.Double(x, y, w, h));
                boolean tall = h > w * 1.3;
                double u = Math.min(w, h), cx = x + w * artFocus, nr = Math.max(11, u * 0.075);
                double[][] pts = new double[4][];
                for (int i = 0; i < 4; i++) {
                    double s = i % 2 == 0 ? -1 : 1;
                    if (tall) pts[i] = new double[]{cx + s * w * 0.2, y + h * (0.22 + 0.16 * i)};
                    else {
                        double span = Math.min(w * 0.72, 380);
                        pts[i] = new double[]{cx - span / 2 + span * i / 3, y + h * 0.56 + s * h * 0.13};
                    }
                }
                Path2D p = new Path2D.Double();
                p.moveTo(pts[0][0], pts[0][1]);
                for (int i = 1; i < 4; i++) {
                    double mx = (pts[i - 1][0] + pts[i][0]) / 2, my = (pts[i - 1][1] + pts[i][1]) / 2;
                    p.curveTo(tall ? pts[i - 1][0] : mx, tall ? my : pts[i - 1][1], tall ? pts[i][0] : mx, tall ? my : pts[i][1], pts[i][0], pts[i][1]);
                }
                g.setColor(cyan(120));
                g.setStroke(new BasicStroke(1.5f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND, 1f, new float[]{4f, 5f}, 0f));
                g.draw(p);
                Font nf = font("Inter-SemiBold", (float) (nr * 0.95));
                for (int i = 0; i < 4; i++) {
                    Shape n = new Ellipse2D.Double(pts[i][0] - nr, pts[i][1] - nr, nr * 2, nr * 2);
                    if (i == 3) {
                        c.fill(new Ellipse2D.Double(pts[i][0] - nr * 1.8, pts[i][1] - nr * 1.8, nr * 3.6, nr * 3.6), cyan(40));
                        c.fill(n, CYAN);
                        Path2D tick = new Path2D.Double();
                        tick.moveTo(pts[i][0] - nr * 0.4, pts[i][1]); tick.lineTo(pts[i][0] - nr * 0.08, pts[i][1] + nr * 0.35);
                        tick.lineTo(pts[i][0] + nr * 0.45, pts[i][1] - nr * 0.35);
                        c.stroke(tick, INK, 2f);
                    } else {
                        c.fill(n, new Color(0x08263A));
                        c.stroke(n, CYAN, 1.5f);
                        String s = String.valueOf(i + 1);
                        c.text(s, pts[i][0] - c.width(s, nf) / 2, pts[i][1] + nr * 0.34, nf, Color.WHITE);
                    }
                }
                double bw = Math.max(34, u * 0.2), bh = bw * 0.72;
                double bx = tall ? cx - bw / 2 + w * 0.12 : cx + Math.min(w * 0.72, 380) * 0.3, by = y + h * (tall ? 0.06 : 0.1);
                Shape bub = rr(bx, by, bw, bh, bh * 0.3);
                Path2D tail = new Path2D.Double();
                tail.moveTo(bx + bw * 0.25, by + bh - 1); tail.lineTo(bx + bw * 0.18, by + bh + bh * 0.35); tail.lineTo(bx + bw * 0.45, by + bh - 1);
                c.fill(bub, white(235)); c.fill(tail, white(235));
                Font qf = font("InterDisplay-Bold", (float) (bh * 0.7));
                c.text("?", bx + bw / 2 - c.width("?", qf) / 2, by + bh * 0.75, qf, INK);
            }
            case "briefcase" -> {
                g.setPaint(new GradientPaint((float) x, (float) y, new Color(0x231A62), (float) x, (float) (y + h), new Color(0x0A1838)));
                g.fill(new Rectangle2D.Double(x, y, w, h));
                double cx = x + w * artFocus, cy = y + h * 0.6;
                double sw = Math.min(Math.min(w * 0.72, h * 0.78), 300), sh = sw * 0.6, bar = sw * 0.13;
                double top = cy - (sh + bar) / 2, left = cx - sw / 2, by = top + bar;
                Shape body = rr(left, by, sw, sh, sw * 0.03);
                c.fill(body, new Color(0x0A0F1A));
                c.stroke(body, white(70), 1.2f);
                c.fill(new Rectangle2D.Double(left + 2, by + sh / 3, sw - 4, 1), white(60));
                c.fill(new Rectangle2D.Double(left + 2, by + sh * 2 / 3, sw - 4, 1), white(60));
                c.fill(new Rectangle2D.Double(cx, by + sh / 3, 1, sh * 2 / 3), white(60));
                Font lab = font("Inter-SemiBold", (float) Math.max(6, sw * 0.05)), big = font("InterDisplay-Bold", (float) (sw * 0.12));
                c.text("PEARLDROP PRODUCTIONS", left + sw * 0.06, by + sh / 3 * 0.62, lab, white(150));
                c.text("SCENE", left + sw * 0.06, by + sh / 3 + sw * 0.07, lab, white(120));
                c.text("YOU", left + sw * 0.06, by + sh * 2 / 3 - sw * 0.03, big, CYAN);
                c.text("TAKE", cx + sw * 0.06, by + sh / 3 + sw * 0.07, lab, white(120));
                c.text("01", cx + sw * 0.06, by + sh * 2 / 3 - sw * 0.03, big, Color.WHITE);
                c.text("ROLL  A    DATE  TODAY", left + sw * 0.06, by + sh - sh / 3 * 0.38, lab, white(140));
                // clapper: hinged at the left, open a few degrees
                for (int part = 0; part < 2; part++) {
                    AffineTransform at = g.getTransform();
                    double py2 = part == 0 ? by - bar : by - bar - 2;
                    if (part == 1) g.rotate(Math.toRadians(-14), left, by - bar);
                    else { g.setTransform(at); }
                    Shape b = new Rectangle2D.Double(left, part == 0 ? by - bar : py2 - bar * 0.9, sw, bar * 0.92);
                    if (part == 1) {
                        c.fill(b, Color.WHITE);
                        Rectangle2D bb = b.getBounds2D();
                        clipped(c, b, () -> {
                            for (double sx = bb.getX() - bar; sx < bb.getMaxX(); sx += bar * 1.6) {
                                Path2D st = new Path2D.Double();
                                st.moveTo(sx, bb.getMaxY()); st.lineTo(sx + bar * 0.8, bb.getMaxY());
                                st.lineTo(sx + bar * 1.6, bb.getY()); st.lineTo(sx + bar * 0.8, bb.getY()); st.closePath();
                                c.fill(st, new Color(0x0A0F1A));
                            }
                        });
                    } else {
                        c.fill(b, Color.WHITE);
                        Rectangle2D bb = b.getBounds2D();
                        clipped(c, b, () -> {
                            for (double sx = bb.getX() - bar; sx < bb.getMaxX(); sx += bar * 1.6) {
                                Path2D st = new Path2D.Double();
                                st.moveTo(sx + bar * 0.8, bb.getMaxY()); st.lineTo(sx + bar * 1.6, bb.getMaxY());
                                st.lineTo(sx + bar * 0.8, bb.getY()); st.lineTo(sx, bb.getY()); st.closePath();
                                c.fill(st, new Color(0x0A0F1A));
                            }
                        });
                    }
                    g.setTransform(at);
                }
            }
        }
    }

    static void iconBox(Canvas c, String icon, double x, double y, double s, boolean on) {
        c.fill(rr(x, y, s, s, s * 0.27), on ? CYAN : cyan(28));
        icon2(c, icon, x + s / 2, y + s / 2, on ? INK : CYAN);
    }

    // ---------- S1: compact dropdown, Live-action regrouped ----------
    static Canvas servicesA(BufferedImage bg, BufferedImage blur) {
        Canvas c = base(bg, blur, 90);
        Map<String, double[]> pos = nav(c, "Services", false);
        double[] t = pos.get("Services");
        double pw = 940, px = Math.max(64, Math.min(t[0] + t[1] / 2 - pw / 2, W - 64 - pw)), py = 82, ph = 470;
        Path2D notch = new Path2D.Double();
        double nx = t[0] + t[1] / 2;
        notch.moveTo(nx - 9, py + 1); notch.lineTo(nx, py - 8); notch.lineTo(nx + 9, py + 1); notch.closePath();
        Area shape = new Area(rr(px, py, pw, ph, 18));
        shape.add(new Area(notch));
        c.g.setColor(new Color(0, 0, 0, 50));
        c.g.fill(rr(px - 2, py + 6, pw + 4, ph + 6, 20));
        c.glass(shape, PANEL);
        c.stroke(shape, white(26), 1f);

        Font lf = label(), sub = font("Inter-Medium", 12f), item = font("Inter-Regular", 14.5f);
        double top = py + 40, lh = 32, colW = 222;
        double x0 = px + 32;
        // Live-action spans two columns, with a soft tint to mark it as the big one.
        c.fill(rr(px + 14, py + 14, colW * 2 + 18, ph - 92, 12), white(5));
        Discipline la = SERVICES.get(0);
        c.text("LIVE-ACTION VIDEO", x0, top, lf, CYAN_DIM);
        c.text("15", x0 + c.width("LIVE-ACTION VIDEO", lf) + 8, top, lf, white(90));
        double[][] slots = {{x0, top + 30}, {x0 + colW, top + 30}, {x0 + colW, top + 30 + 5 * lh + 10}};
        for (int gi = 0; gi < la.groups().length; gi++) {
            String[] grp = la.groups()[gi];
            double gx = slots[gi][0], gy = slots[gi][1];
            c.text(grp[0], gx, gy, sub, white(110));
            for (int i = 1; i < grp.length; i++) {
                double y = gy + i * lh;
                boolean hover = gi == 1 && i == 3;
                if (hover) {
                    hoverRow(c, gx - 10, y - 22, colW - 14, 32);
                    arrow(c, gx + colW - 46, y - 5, 11, CYAN, 1.6f);
                }
                c.text(grp[i], gx, y, item, hover ? Color.WHITE : white(205));
            }
        }
        // Remaining three disciplines in two columns.
        double x2 = x0 + colW * 2 + 32, x3 = x2 + colW - 20;
        double[][] spots = {{x2, top}, {x3, top}, {x2, top + 3 * lh + 34}};
        int[] order = {1, 2, 3};
        for (int k = 0; k < 3; k++) {
            Discipline d = SERVICES.get(order[k]);
            double gx = spots[k][0], gy = spots[k][1];
            c.text(d.name().toUpperCase(), gx, gy, lf, CYAN_DIM);
            String[] items = d.groups()[0];
            for (int i = 1; i < items.length; i++) c.text(items[i], gx, gy + 30 + (i - 1) * lh, item, white(205));
        }

        double fy = py + ph - 62;
        c.fill(new Rectangle2D.Double(px + 1, fy, pw - 2, 1), LINE);
        c.fill(rr(px + 1, fy + 1, pw - 2, 60, 0), white(6));
        c.fill(new Ellipse2D.Double(x0 - 2, fy + 15, 30, 30), CYAN);
        icon(c, "play", x0 + 13.5, fy + 30, INK);
        c.text("Watch the showreel", x0 + 40, fy + 36, font("Inter-SemiBold", 15f), Color.WHITE);
        Font q = font("Inter-Medium", 14f);
        String s = "Not sure what you need? Talk to a producer";
        double sx = px + pw - 32 - 22 - c.width(s, q);
        c.text(s, sx, fy + 36, q, white(190));
        arrow(c, sx + c.width(s, q) + 8, fy + 31, 13, CYAN, 1.7f);
        return c;
    }

    // ---------- S2: mega panel with a discipline rail ----------
    static Canvas servicesB(BufferedImage bg, BufferedImage blur) {
        Canvas c = base(bg, blur, 120);
        double ph = 490;
        c.glass(new Rectangle2D.Double(0, 0, W, ph), new Color(6, 16, 36, 240));
        c.fill(new Rectangle2D.Double(0, ph, W, 1), white(30));
        c.fill(new Rectangle2D.Double(64, NAV_H, W - 128, 1), LINE);
        nav(c, "Services", true);

        double rx = 64, ry = NAV_H + 28, rw = 330, rowH = 78;
        Font name = font("Inter-SemiBold", 17f), tag = font("Inter-Regular", 13f);
        for (int i = 0; i < SERVICES.size(); i++) {
            Discipline d = SERVICES.get(i);
            double y = ry + i * (rowH + 6);
            boolean on = i == 0;
            if (on) {
                c.fill(rr(rx, y, rw, rowH, 14), white(12));
                c.fill(rr(rx, y + 18, 3, rowH - 36, 1.5), CYAN);
            }
            iconBox(c, d.icon(), rx + 20, y + 19, 40, on);
            c.text(d.name(), rx + 76, y + 35, name, on ? Color.WHITE : white(200));
            c.text(d.tagline(), rx + 76, y + 56, tag, white(on ? 160 : 110));
            Font cnt = font("Inter-Medium", 12f);
            String n = String.valueOf(d.count());
            c.text(n, rx + rw - 24 - c.width(n, cnt), y + 35, cnt, white(on ? 170 : 90));
        }
        c.fill(new Rectangle2D.Double(rx + rw + 36, ry, 1, ph - ry - 28), LINE);

        double cx = rx + rw + 76;
        Discipline la = SERVICES.get(0);
        c.text("Live-action video", cx, ry + 34, tracked(font("InterDisplay-SemiBold", 28f), -0.015f), Color.WHITE);
        Font link = font("Inter-SemiBold", 14f);
        String all = "All live-action";
        double lx = 1376 - 290 - 40 - 20 - c.width(all, link);
        c.text(all, lx, ry + 30, link, CYAN);
        arrow(c, lx + c.width(all, link) + 8, ry + 25, 12, CYAN, 1.6f);

        Font lf = label(), item = font("Inter-Medium", 14.5f);
        double gy = ry + 84;
        double[] gx = {cx, cx + 230, cx + 460};
        for (int k = 0; k < 3; k++) {
            String[] grp = la.groups()[k];
            c.text(grp[0].toUpperCase(), gx[k], gy, lf, CYAN_DIM);
            int perCol = 8;
            for (int i = 1; i < grp.length; i++) {
                double y = gy + 30 + ((i - 1) % perCol) * 31;
                boolean hover = k == 0 && i == 1;
                c.text(grp[i], gx[k], y, item, hover ? CYAN : white(210));
                if (hover) arrow(c, gx[k] + c.width(grp[i], item) + 10, y - 5, 11, CYAN, 1.6f);
            }
        }
        // feature card
        double fx = 1376 - 290, fy = ry, fw = 290, fh = ph - ry - 32;
        Shape card = rr(fx, fy, fw, fh, 16);
        clipped(c, card, () -> {
            art(c, "clapper", fx, fy, fw, fh);
            c.g.setPaint(new GradientPaint(0, (float) (fy + fh * 0.35), new Color(2, 8, 20, 0), 0, (float) (fy + fh), new Color(2, 8, 20, 230)));
            c.g.fill(card);
        });
        c.stroke(card, white(30), 1f);
        c.fill(new Ellipse2D.Double(fx + 20, fy + 20, 40, 40), white(235));
        icon(c, "play", fx + 41, fy + 40, INK);
        c.text("FEATURED", fx + 22, fy + fh - 92, lf, CYAN_DIM);
        c.text("Live-action reel", fx + 22, fy + fh - 64, font("Inter-SemiBold", 18f), Color.WHITE);
        c.text("A cut of what we shoot,", fx + 22, fy + fh - 40, tag, white(170));
        c.text("from launches to drone work.", fx + 22, fy + fh - 21, tag, white(170));
        return c;
    }

    // ---------- shared card layouts (used by Services and About us) ----------
    static List<String> allItems(Discipline d) {
        List<String> items = new ArrayList<>();
        for (String[] g : d.groups()) for (int k = 1; k < g.length; k++) items.add(g[k]);
        return items;
    }

    static void legalRow(Canvas c, double y) {
        Font tiny = font("Inter-Regular", 12.5f);
        String legal = "Terms of Service     Privacy Policy";
        c.text(legal, W - 64 - c.width(legal, tiny), y, tiny, white(110));
    }

    /** Four cards, artwork on top, links below. */
    static Canvas cardsMenu(BufferedImage bg, BufferedImage blur, String navItem, List<Discipline> ds, int hover,
                            List<List<String>> shown, String[] links, boolean legal) {
        Canvas c = base(bg, blur, 120);
        double ph = legal ? 612 : 580;
        c.glass(new Rectangle2D.Double(0, 0, W, ph), new Color(6, 16, 36, 228));
        c.fill(new Rectangle2D.Double(0, ph, W, 1), white(30));
        nav(c, navItem, true);

        double gap = 20, cw = (W - 128 - gap * 3) / 4, cy = NAV_H + 24, ch = 580 - cy - 28;
        Font title = font("Inter-SemiBold", 18f), tag = font("Inter-Italic", 13f), item = font("Inter-Regular", 14.5f);
        for (int i = 0; i < 4; i++) {
            Discipline d = ds.get(i);
            double x = 64 + i * (cw + gap);
            boolean on = i == hover;
            Shape card = rr(x, cy, cw, ch, 16);
            c.fill(card, on ? new Color(16, 34, 64, 235) : new Color(10, 24, 50, 225));
            Area artArea = new Area(rr(x, cy, cw, 140, 16));
            artArea.add(new Area(new Rectangle2D.Double(x, cy + 120, cw, 20)));
            artFocus = 0.5;
            clipped(c, artArea, () -> art(c, d.icon(), x, cy, cw, 140));
            c.stroke(card, on ? cyan(90) : white(24), 1f);
            c.fill(new Rectangle2D.Double(x, cy + 140, cw, 1), white(24));

            c.text(d.name(), x + 22, cy + 176, title, Color.WHITE);
            c.text(d.tagline(), x + 22, cy + 198, tag, white(140));
            List<String> items = shown.get(i);
            for (int k = 0; k < items.size(); k++) c.text(items.get(k), x + 22, cy + 236 + k * 30, item, white(205));
            Font more = font("Inter-SemiBold", 13.5f);
            String m = links[i];
            double my = cy + ch - 24;
            c.text(m, x + 22, my, more, on ? CYAN : white(200));
            arrow(c, x + 22 + c.width(m, more) + 8, my - 5, 12, on ? CYAN : white(200), 1.6f);
        }
        if (legal) legalRow(c, ph - 16);
        return c;
    }

    /** Four full-bleed frames; the hovered one widens into a viewfinder. */
    static Canvas framesMenu(BufferedImage bg, BufferedImage blur, String navItem, List<Discipline> ds, int openIdx,
                             String hoverItem, String cta, boolean legal) {
        Canvas c = base(bg, blur, 150);
        double ph = legal ? 668 : 640;
        c.glass(new Rectangle2D.Double(0, 0, W, ph), new Color(4, 10, 24, 240));
        nav(c, navItem, true);

        double x = 64, y = NAV_H + 24, h = 640 - y - 32, gap = 12, open = 660;
        double closed = (W - 128 - open - gap * 3) / 3;
        for (int i = 0; i < 4; i++) {
            Discipline d = ds.get(i);
            boolean on = i == openIdx;
            double w = on ? open : closed, fx = x;
            Shape card = rr(fx, y, w, h, 18);
            clipped(c, card, () -> {
                if (on) {
                    artFocus = 0.76;
                    art(c, d.icon(), fx, y, w, h);
                    c.g.setPaint(new GradientPaint((float) fx, 0, new Color(5, 14, 32, 250), (float) (fx + w * 0.92), 0, new Color(5, 14, 32, 40)));
                    c.g.fill(card);
                } else {
                    artFocus = 0.5;
                    art(c, d.icon(), fx, y, w, h);
                    c.g.setPaint(new GradientPaint(0, (float) (y + h * 0.35), new Color(3, 9, 22, 30), 0, (float) (y + h), new Color(3, 9, 22, 235)));
                    c.g.fill(card);
                }
            });
            c.stroke(card, on ? cyan(110) : white(30), 1f);

            Font num = font("Inter-Medium", 12f);
            c.text(String.format("%02d", i + 1), fx + 22, y + 34, num, on ? CYAN : white(170));
            if (!on) {
                iconBox(c, d.icon(), fx + 22, y + h - 150, 36, false);
                c.text(d.name(), fx + 22, y + h - 82, font("Inter-SemiBold", 19f), Color.WHITE);
                String[] words = d.tagline().split(" ");
                StringBuilder l1 = new StringBuilder(), l2 = new StringBuilder();
                Font tf = font("Inter-Regular", 13f);
                for (String wd : words) {
                    if (l2.length() == 0 && c.width(l1 + wd, tf) < w - 44) l1.append(wd).append(' ');
                    else l2.append(wd).append(' ');
                }
                c.text(l1.toString().trim(), fx + 22, y + h - 58, tf, white(160));
                c.text(l2.toString().trim(), fx + 22, y + h - 39, tf, white(160));
            } else {
                double rx = fx + w - 140;
                c.fill(new Ellipse2D.Double(rx, y + 24, 9, 9), new Color(0xFF4D5E));
                c.text("REC  00:00:12:08", rx + 16, y + 33, font("Inter-Medium", 11.5f), white(200));
                double in = 20, L = 18;
                double[][] corners = {{fx + w - in, y + in + 34, -1, 1}, {fx + w - in, y + h - in, -1, -1}};
                for (double[] k : corners) {
                    Path2D p = new Path2D.Double();
                    p.moveTo(k[0], k[1] + L * k[3]); p.lineTo(k[0], k[1]); p.lineTo(k[0] + L * k[2], k[1]);
                    c.stroke(p, white(150), 1.5f);
                }

                c.text(d.name(), fx + 30, y + 90, tracked(font("InterDisplay-SemiBold", 38f), -0.02f), Color.WHITE);
                c.text(d.tagline(), fx + 30, y + 118, font("Inter-Regular", 15f), white(180));
                List<String> flat = allItems(d);
                if (flat.size() > 6) {
                    Font lf = label(), chip = font("Inter-Medium", 13f);
                    double cy = y + 160;
                    for (String[] grp : d.groups()) {
                        c.text(grp[0].toUpperCase(), fx + 30, cy, lf, CYAN_DIM);
                        double cx = fx + 30, row = cy + 14;
                        for (int k = 1; k < grp.length; k++) {
                            double cw = c.width(grp[k], chip) + 26;
                            if (cx + cw > fx + 30 + 520) { cx = fx + 30; row += 36; }
                            boolean hv = grp[k].equals(hoverItem);
                            Shape pill = rr(cx, row, cw, 29, 14.5);
                            c.fill(pill, hv ? CYAN : new Color(10, 26, 52, 210));
                            c.stroke(pill, hv ? CYAN : white(40), 1f);
                            c.text(grp[k], cx + 13, row + 19.5, chip, hv ? INK : white(225));
                            cx += cw + 8;
                        }
                        cy = row + 29 + 32;
                    }
                } else {
                    // short lists read better as big rows than as chips
                    Font rf = font("Inter-Medium", 18f);
                    double ly = y + 186, rw = 360;
                    for (String s : flat) {
                        boolean hv = s.equals(hoverItem);
                        if (hv) {
                            c.fill(rr(fx + 18, ly - 29, rw + 24, 44, 10), new Color(255, 255, 255, 18));
                            arrow(c, fx + 18 + rw - 4, ly - 7, 14, CYAN, 1.8f);
                        }
                        c.text(s, fx + 30, ly, rf, hv ? CYAN : white(225));
                        if (!hv) c.fill(new Rectangle2D.Double(fx + 30, ly + 15, rw, 1), white(20));
                        ly += 48;
                    }
                }
                Font bf = font("Inter-SemiBold", 14.5f);
                double bw = c.width(cta, bf) + 66, by = y + h - 70, bx = fx + w - 48 - bw;
                c.fill(rr(bx, by, bw, 42, 21), Color.WHITE);
                c.text(cta, bx + 22, by + 26, bf, INK);
                arrow(c, bx + 22 + c.width(cta, bf) + 10, by + 21, 13, INK, 1.8f);
            }
            x += w + gap;
        }
        if (legal) legalRow(c, ph - 16);
        return c;
    }

    // ---------- S3: four discipline cards with artwork ----------
    static Canvas servicesC(BufferedImage bg, BufferedImage blur) {
        List<List<String>> shown = new ArrayList<>();
        for (Discipline d : SERVICES) shown.add(allItems(d));
        shown.set(0, List.of("Company profiles", "Promotional", "Live events", "Product", "Aerial / drone"));
        return cardsMenu(bg, blur, "Services", SERVICES, 2, shown,
                new String[]{"All 15 services", "Explore animation", "Explore photography", "Explore post-production"}, false);
    }

    // ---------- S5: the visually interesting one — expanding frames ----------
    static Canvas servicesE(BufferedImage bg, BufferedImage blur) {
        return framesMenu(bg, blur, "Services", SERVICES, 0, "Live events", "Explore live-action", false);
    }

    // =====================================================================
    // ABOUT US, reworked in the two card styles
    // =====================================================================
    // Legal leaves the menu for a footer row; "Our work" pulls the proof pages together.
    static final List<Discipline> ABOUT = List.of(
            new Discipline("The company", "people", "Since 2003. Still can't sit still.", new String[][]{
                    {"", "Meet Pearldrop", "Our values", "Behind the scenes", "Memberships & accreditations"}}),
            new Discipline("Our work", "play", "The proof is in the playback.", new String[][]{
                    {"", "Our showreels", "Our clients", "Testimonials"}}),
            new Discipline("Working with us", "path", "The whys, the hows, the FAQs.", new String[][]{
                    {"", "How we work", "Why Pearldrop?", "Why video?", "Sustainability", "FAQ"}}),
            new Discipline("Careers", "briefcase", "Come make things with us.", new String[][]{
                    {"", "Recruitment", "Work experience"}}));

    static Canvas aboutFrames(BufferedImage bg, BufferedImage blur, int openIdx, String hover, String cta) {
        return framesMenu(bg, blur, "About us", ABOUT, openIdx, hover, cta, true);
    }

    static Canvas aboutCards(BufferedImage bg, BufferedImage blur) {
        List<List<String>> shown = new ArrayList<>();
        for (Discipline d : ABOUT) shown.add(allItems(d));
        return cardsMenu(bg, blur, "About us", ABOUT, 1, shown,
                new String[]{"More about us", "Watch the showreels", "How we work", "Join the team"}, true);
    }

    // ---------- S4: editorial — big disciplines left, detail right ----------
    static Canvas servicesD(BufferedImage bg, BufferedImage blur) {
        Canvas c = base(bg, blur, 150);
        double ph = 620;
        c.glass(new Rectangle2D.Double(0, 0, W, ph), new Color(5, 13, 30, 244));
        c.fill(new Rectangle2D.Double(0, ph - 3, W, 3), CYAN);
        nav(c, "Services", true);

        Font big = tracked(font("InterDisplay-SemiBold", 44f), -0.02f), num = font("Inter-Medium", 12f), tag = font("Inter-Regular", 14f);
        c.text("WHAT WE MAKE", 64, 156, label(), CYAN_DIM);
        for (int i = 0; i < 4; i++) {
            Discipline d = SERVICES.get(i);
            double y = 222 + i * 96;
            boolean on = i == 0;
            c.text(String.format("%02d", i + 1), 64, y - 26, num, on ? CYAN : white(90));
            c.text(d.name(), 100, y, big, on ? CYAN : white(on ? 255 : 150));
            if (on) arrow(c, 100 + c.width(d.name(), big) + 18, y - 15, 26, CYAN, 2.2f);
            c.text(d.tagline(), 100, y + 28, tag, white(on ? 180 : 90));
        }
        c.fill(new Rectangle2D.Double(700, 136, 1, 440), LINE);

        Discipline la = SERVICES.get(0);
        Font lf = label(), item = font("Inter-Regular", 15f);
        double[] gx = {750, 990, 990};
        double[] gy = {156, 156, 156 + 5 * 34 + 30};
        for (int k = 0; k < 3; k++) {
            String[] grp = la.groups()[k];
            c.text(grp[0].toUpperCase(), gx[k], gy[k], lf, CYAN_DIM);
            for (int i = 1; i < grp.length; i++) c.text(grp[i], gx[k], gy[k] + i * 34, item, white(210));
        }
        // a small art panel to the right
        double ax = 1216, ay = 140, aw = 160, ah = 300;
        Shape a = rr(ax, ay, aw, ah, 14);
        clipped(c, a, () -> art(c, "clapper", ax, ay, aw, ah));
        c.stroke(a, white(30), 1f);
        Shape cta = rr(ax, ay + ah + 20, aw, 116, 14);
        c.fill(cta, cyan(18));
        c.stroke(cta, cyan(60), 1f);
        c.text("Not sure", ax + 18, ay + ah + 52, font("Inter-SemiBold", 15f), Color.WHITE);
        c.text("where to start?", ax + 18, ay + ah + 72, font("Inter-SemiBold", 15f), Color.WHITE);
        c.text("Talk to a producer", ax + 18, ay + ah + 102, font("Inter-Medium", 13f), CYAN);
        return c;
    }

    // =====================================================================
    // PORTFOLIO, in the two card styles (three real groups, so three cards)
    // =====================================================================
    record PCard(String name, String art, String tagline, String[] rows, String cta) {}
    static final List<PCard> PORTFOLIO = List.of(
            new PCard("Live-action", "clapper", "The good stuff, moving.",
                    new String[]{"Browse live-action work", "Live-action services", "Case studies"}, "Play the reel"),
            new PCard("2D animation", "anim", "The good stuff, drawn.",
                    new String[]{"Browse 2D animation", "Animation services"}, "Play the reel"),
            new PCard("Photography", "camera", "The good stuff, holding still.",
                    new String[]{"Architectural", "Automotive", "Conferences & ceremonies", "Headshots", "Lifestyle", "Live events"},
                    "All photography"));

    static String[] wrap2(Canvas c, String s, Font f, double maxW) {
        StringBuilder l1 = new StringBuilder(), l2 = new StringBuilder();
        for (String wd : s.split(" ")) {
            if (l2.length() == 0 && c.width(l1 + wd, f) < maxW) l1.append(wd).append(' ');
            else l2.append(wd).append(' ');
        }
        return new String[]{l1.toString().trim(), l2.toString().trim()};
    }

    static void bigPlay(Canvas c, double cx, double cy, double r) {
        c.fill(new Ellipse2D.Double(cx - r * 1.5, cy - r * 1.5, r * 3, r * 3), white(30));
        c.fill(new Ellipse2D.Double(cx - r, cy - r, r * 2, r * 2), white(240));
        Path2D p = new Path2D.Double();
        p.moveTo(cx - r * 0.28, cy - r * 0.4); p.lineTo(cx + r * 0.45, cy); p.lineTo(cx - r * 0.28, cy + r * 0.4); p.closePath();
        c.fill(p, INK);
    }

    /** A photo-style thumbnail: a crop of the sequin hero with a tint. */
    static void photoTile(Canvas c, int k, double x, double y, double w, double h) {
        int[][] crops = {{880, 300}, {1060, 520}, {940, 640}, {1120, 330}, {1000, 450}, {900, 560}};
        Color[] tints = {cyan(40), new Color(138, 123, 255, 60), new Color(40, 190, 170, 50), new Color(0, 0, 0, 0),
                new Color(255, 170, 90, 40), new Color(58, 123, 255, 60)};
        int[] cr = crops[k % crops.length];
        double sw = 300, sh = sw * h / w;
        c.g.drawImage(c.bg, (int) x, (int) y, (int) (x + w), (int) (y + h),
                cr[0] * S, cr[1] * S, (int) ((cr[0] + sw) * S), (int) ((cr[1] + sh) * S), null);
        c.fill(new Rectangle2D.Double(x, y, w, h), tints[k % tints.length]);
        c.g.setPaint(new GradientPaint(0, (float) (y + h * 0.4), new Color(2, 8, 20, 0), 0, (float) (y + h), new Color(2, 8, 20, 220)));
        c.g.fill(new Rectangle2D.Double(x, y, w, h));
    }

    static Canvas portfolioFrames(BufferedImage bg, BufferedImage blur, int openIdx, int hoverTile) {
        Canvas c = base(bg, blur, 150);
        c.glass(new Rectangle2D.Double(0, 0, W, 640), new Color(4, 10, 24, 240));
        nav(c, "Portfolio", true);

        double x = 64, y = NAV_H + 24, h = 640 - y - 32, gap = 12, open = 760;
        double closed = (W - 128 - open - gap * 2) / 2;
        for (int i = 0; i < 3; i++) {
            PCard d = PORTFOLIO.get(i);
            boolean on = i == openIdx, photo = d.art().equals("camera");
            double w = on ? open : closed, fx = x;
            Shape card = rr(fx, y, w, h, 18);
            clipped(c, card, () -> {
                artFocus = on ? 0.76 : 0.5;
                art(c, d.art(), fx, y, w, h);
                if (on) c.g.setPaint(new GradientPaint((float) fx, 0, new Color(5, 14, 32, 250), (float) (fx + w * (photo ? 1.6 : 0.92)), 0, new Color(5, 14, 32, 40)));
                else c.g.setPaint(new GradientPaint(0, (float) (y + h * 0.35), new Color(3, 9, 22, 30), 0, (float) (y + h), new Color(3, 9, 22, 235)));
                c.g.fill(card);
            });
            c.stroke(card, on ? cyan(110) : white(30), 1f);
            c.text(String.format("%02d", i + 1), fx + 22, y + 34, font("Inter-Medium", 12f), on ? CYAN : white(170));

            if (!on) {
                if (!photo) bigPlay(c, fx + w / 2, y + h * 0.42, 26);
                iconBox(c, d.art(), fx + 22, y + h - 150, 36, false);
                c.text(d.name(), fx + 22, y + h - 82, font("Inter-SemiBold", 19f), Color.WHITE);
                Font tf = font("Inter-Regular", 13f);
                String[] t = wrap2(c, d.tagline(), tf, w - 44);
                c.text(t[0], fx + 22, y + h - 58, tf, white(160));
                c.text(t[1], fx + 22, y + h - 39, tf, white(160));
                x += w + gap;
                continue;
            }
            double rx = fx + w - 140;
            c.fill(new Ellipse2D.Double(rx, y + 24, 9, 9), new Color(0xFF4D5E));
            c.text("REC  00:00:12:08", rx + 16, y + 33, font("Inter-Medium", 11.5f), white(200));
            c.text(d.name(), fx + 30, y + 90, tracked(font("InterDisplay-SemiBold", 38f), -0.02f), Color.WHITE);
            c.text(d.tagline(), fx + 30, y + 118, font("Inter-Regular", 15f), white(180));

            if (photo) {
                Font lk = font("Inter-SemiBold", 14f);
                double lx = fx + w - 30 - 22 - c.width(d.cta(), lk);
                c.text(d.cta(), lx, y + 118, lk, CYAN);
                arrow(c, lx + c.width(d.cta(), lk) + 8, y + 113, 12, CYAN, 1.6f);
                double gx = fx + 30, gy = y + 146, tw = (w - 60 - 24) / 3, th = (h - 146 - 30 - 12) / 2;
                Font tl = font("Inter-SemiBold", 14.5f);
                for (int k = 0; k < 6; k++) {
                    double tx = gx + (k % 3) * (tw + 12), ty = gy + (k / 3) * (th + 12);
                    boolean hv = k == hoverTile;
                    Shape tile = rr(tx, ty, tw, th, 12);
                    final int kk = k;
                    clipped(c, tile, () -> photoTile(c, kk, tx, ty, tw, th));
                    c.stroke(tile, hv ? CYAN : white(40), hv ? 1.6f : 1f);
                    c.text(d.rows()[k], tx + 16, ty + th - 16, tl, hv ? CYAN : Color.WHITE);
                    if (hv) arrow(c, tx + tw - 30, ty + th - 21, 13, CYAN, 1.7f);
                }
            } else {
                double in = 20, L = 18;
                double[][] corners = {{fx + w - in, y + in + 34, -1, 1}, {fx + w - in, y + h - in, -1, -1}};
                for (double[] k : corners) {
                    Path2D p = new Path2D.Double();
                    p.moveTo(k[0], k[1] + L * k[3]); p.lineTo(k[0], k[1]); p.lineTo(k[0] + L * k[2], k[1]);
                    c.stroke(p, white(150), 1.5f);
                }
                Font rf = font("Inter-Medium", 18f);
                double ly = y + 186, rw = 340;
                for (int k = 0; k < d.rows().length; k++) {
                    boolean hv = k == 0;
                    if (hv) {
                        c.fill(rr(fx + 18, ly - 29, rw + 24, 44, 10), new Color(255, 255, 255, 18));
                        arrow(c, fx + 18 + rw - 4, ly - 7, 14, CYAN, 1.8f);
                    }
                    c.text(d.rows()[k], fx + 30, ly, rf, hv ? CYAN : white(225));
                    if (!hv) c.fill(new Rectangle2D.Double(fx + 30, ly + 15, rw, 1), white(20));
                    ly += 48;
                }
                double pcx = fx + w * 0.74, pcy = y + h * 0.5;
                bigPlay(c, pcx, pcy, 40);
                Font pf = font("Inter-SemiBold", 15f);
                c.text(d.cta(), pcx - c.width(d.cta(), pf) / 2, pcy + 92, pf, Color.WHITE);
            }
            x += w + gap;
        }
        return c;
    }

    static Canvas portfolioCards(BufferedImage bg, BufferedImage blur, int hover) {
        Canvas c = base(bg, blur, 120);
        double ph = 600;
        c.glass(new Rectangle2D.Double(0, 0, W, ph), new Color(6, 16, 36, 228));
        c.fill(new Rectangle2D.Double(0, ph, W, 1), white(30));
        nav(c, "Portfolio", true);

        double gap = 20, cw = (W - 128 - gap * 2) / 3, cy = NAV_H + 24, ch = ph - cy - 28, ah = 190;
        Font title = font("Inter-SemiBold", 19f), tag = font("Inter-Italic", 13.5f), item = font("Inter-Regular", 14.5f);
        for (int i = 0; i < 3; i++) {
            PCard d = PORTFOLIO.get(i);
            boolean on = i == hover, photo = d.art().equals("camera");
            double x = 64 + i * (cw + gap);
            Shape card = rr(x, cy, cw, ch, 16);
            c.fill(card, on ? new Color(16, 34, 64, 235) : new Color(10, 24, 50, 225));
            Area artArea = new Area(rr(x, cy, cw, ah, 16));
            artArea.add(new Area(new Rectangle2D.Double(x, cy + ah - 20, cw, 20)));
            if (photo) {
                // a contact sheet of the six photo types instead of a single image
                clipped(c, artArea, () -> {
                    double tw = (cw - 4) / 3, th = (ah - 2) / 2;
                    for (int k = 0; k < 6; k++) photoTile(c, k, x + (k % 3) * (tw + 2), cy + (k / 3) * (th + 2), tw, th);
                });
            } else {
                artFocus = 0.5;
                clipped(c, artArea, () -> art(c, d.art(), x, cy, cw, ah));
                bigPlay(c, x + cw / 2, cy + ah / 2, 24);
            }
            c.stroke(card, on ? cyan(90) : white(24), 1f);
            c.fill(new Rectangle2D.Double(x, cy + ah, cw, 1), white(24));

            c.text(d.name(), x + 24, cy + ah + 38, title, Color.WHITE);
            c.text(d.tagline(), x + 24, cy + ah + 61, tag, white(140));
            double ly = cy + ah + 100;
            if (photo) {
                for (int k = 0; k < 6; k++) {
                    boolean hv = on && k == 4;
                    double tx = x + 24 + (k / 3) * 236, ty = ly + (k % 3) * 30;
                    c.text(d.rows()[k], tx, ty, item, hv ? CYAN : white(205));
                    if (hv) arrow(c, tx + c.width(d.rows()[k], item) + 8, ty - 5, 11, CYAN, 1.6f);
                }
            } else {
                for (int k = 0; k < d.rows().length; k++) c.text(d.rows()[k], x + 24, ly + k * 30, item, white(205));
            }
            Font more = font("Inter-SemiBold", 13.5f);
            double my = cy + ch - 24;
            c.text(d.cta(), x + 24, my, more, on ? CYAN : white(200));
            arrow(c, x + 24 + c.width(d.cta(), more) + 8, my - 5, 12, on ? CYAN : white(200), 1.6f);
        }
        return c;
    }

    // ---------- overview sheet ----------
    static void overview(File dir, String outName, String heading, String sub, String[][] concepts) throws Exception {
        int tw = 640, th = 400, gap = 48, cols = 2;
        int rows = (concepts.length + 1) / cols;
        int ow = 64 * 2 + tw * cols + gap, oh = 200 + rows * (th + 170);
        BufferedImage out = new BufferedImage(ow * S, oh * S, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = out.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_FRACTIONALMETRICS, RenderingHints.VALUE_FRACTIONALMETRICS_ON);
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g.scale(S, S);
        g.setColor(new Color(0x040A16));
        g.fillRect(0, 0, ow, oh);
        g.setFont(tracked(font("InterDisplay-SemiBold", 36f), -0.02f));
        g.setColor(Color.WHITE);
        g.drawString(heading, 64, 96);
        g.setFont(font("Inter-Regular", 16f));
        g.setColor(white(160));
        g.drawString(sub, 64, 130);

        for (int i = 0; i < concepts.length; i++) {
            int x = 64 + (i % cols) * (tw + gap), y = 180 + (i / cols) * (th + 170);
            BufferedImage im = ImageIO.read(new File(dir, concepts[i][0]));
            BufferedImage half = new BufferedImage(im.getWidth() / 2, im.getHeight() / 2, BufferedImage.TYPE_INT_RGB);
            Graphics2D hg = half.createGraphics();
            hg.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            hg.drawImage(im, 0, 0, half.getWidth(), half.getHeight(), null);
            hg.dispose();
            Shape clip = rr(x, y, tw, th, 12);
            Shape old = g.getClip();
            g.clip(clip);
            g.drawImage(half, x, y, tw, th, null);
            g.setClip(old);
            g.setColor(white(30));
            g.draw(clip);
            g.setFont(font("Inter-SemiBold", 18f));
            g.setColor(Color.WHITE);
            g.drawString(concepts[i][1], x, y + th + 38);
            g.setFont(font("Inter-Regular", 14.5f));
            g.setColor(white(170));
            for (int l = 2; l < concepts[i].length; l++) g.drawString(concepts[i][l], x, y + th + 40 + (l - 1) * 24);
        }
        g.dispose();
        ImageIO.write(out, "png", new File(dir, outName));
    }

    public static void main(String[] args) throws Exception {
        File dir = new File(args.length > 0 ? args[0] : ".");
        dir.mkdirs();
        BufferedImage bg = hero();
        BufferedImage blur = boxBlur(bg, 22, 3);

        conceptA(bg, blur).save(new File(dir, "A-compact-dropdown.png"));
        conceptB(bg, blur).save(new File(dir, "B-mega-panel-feature.png"));
        conceptC(bg, blur).save(new File(dir, "C-icon-tiles.png"));
        conceptD(bg, blur).save(new File(dir, "D-editorial-overlay.png"));
        conceptE(bg).save(new File(dir, "E-mobile-drill-in.png"));

        overview(dir, "00-overview.png", "pearldrop.com v3 — About us menu",
                "Five directions for the About us menu. Same pages throughout; legal links move to the footer.", new String[][]{
                {"A-compact-dropdown.png", "A · Compact dropdown",
                        "Anchored under About us, two grouped columns, quiet labels.",
                        "One showreel link and the tagline in a footer strip."},
                {"B-mega-panel-feature.png", "B · Mega panel + showreel card",
                        "Full-width, but shallow. A showreel thumbnail leads, three",
                        "even columns follow, legal sits in a small bottom row."},
                {"C-icon-tiles.png", "C · Icon tiles",
                        "Six key pages as tiles with one-line descriptions;",
                        "the remaining pages become chips underneath."},
                {"D-editorial-overlay.png", "D · Editorial overlay",
                        "Brand statement and testimonial left, six big-type links",
                        "centre, the long tail in small type on the right."},
                {"E-mobile-drill-in.png", "E · Mobile drill-in",
                        "Short top-level list; About us slides in as one",
                        "grouped list with the showreel at the top."},
        });

        servicesA(bg, blur).save(new File(dir, "S1-compact-dropdown.png"));
        servicesB(bg, blur).save(new File(dir, "S2-discipline-rail.png"));
        servicesC(bg, blur).save(new File(dir, "S3-discipline-cards.png"));
        servicesD(bg, blur).save(new File(dir, "S4-editorial.png"));
        servicesE(bg, blur).save(new File(dir, "S5-expanding-frames.png"));
        overview(dir, "00-services-overview.png", "pearldrop.com v3 — Services menu",
                "Live-action's 15 items regrouped into Formats, Events and Specialist so no column becomes a wall.", new String[][]{
                {"S1-compact-dropdown.png", "S1 · Compact dropdown",
                        "Live-action gets a tinted double column with three sub-groups;",
                        "the three short disciplines share the other two columns."},
                {"S2-discipline-rail.png", "S2 · Discipline rail",
                        "Pick a discipline on the left, its services fill the right.",
                        "Column lengths no longer matter. Featured reel on the end."},
                {"S3-discipline-cards.png", "S3 · Discipline cards",
                        "Four equal cards with drawn artwork; Live-action shows its",
                        "top five plus a link to all 15, so the cards stay even."},
                {"S4-editorial.png", "S4 · Editorial",
                        "Disciplines as big numbered type; the hovered one",
                        "opens its grouped services and a talk-to-a-producer card."},
                {"S5-expanding-frames.png", "S5 · Expanding frames",
                        "Four full-bleed frames; hovering one widens it into a",
                        "viewfinder with services as chips. The showpiece option."},
        });

        aboutFrames(bg, blur, 0, "Our values", "Meet Pearldrop").save(new File(dir, "A1-frames-company.png"));
        aboutFrames(bg, blur, 1, "Our showreels", "Watch the showreels").save(new File(dir, "A2-frames-our-work.png"));
        aboutCards(bg, blur).save(new File(dir, "A3-cards.png"));
        overview(dir, "00-about-cards-overview.png", "pearldrop.com v3 — About us, card styles",
                "Four cards: The company, Our work, Working with us, Careers. Legal moves to a footer row.", new String[][]{
                {"A1-frames-company.png", "A1 · Expanding frames — The company",
                        "Hovering a frame widens it; short lists become big rows",
                        "instead of chips. Pearl motif with ripples behind."},
                {"A2-frames-our-work.png", "A2 · Expanding frames — Our work",
                        "Same menu, mouse moved one card right: the film strip",
                        "frame opens and The company folds back."},
                {"A3-cards.png", "A3 · Cards with artwork on top",
                        "Same four groups as equal cards. Every list fits,",
                        "so no 'more' truncation is needed."},
        });

        portfolioFrames(bg, blur, 2, 4).save(new File(dir, "P1-frames-photography.png"));
        portfolioFrames(bg, blur, 0, -1).save(new File(dir, "P2-frames-live-action.png"));
        portfolioCards(bg, blur, 2).save(new File(dir, "P3-cards.png"));
        overview(dir, "00-portfolio-overview.png", "pearldrop.com v3 — Portfolio, card styles",
                "Three real groups, so three cards: Live-action, 2D animation, Photography.", new String[][]{
                {"P1-frames-photography.png", "P1 · Expanding frames — Photography",
                        "The open frame becomes a grid of the six photo types,",
                        "echoing the thumbnails from the draft."},
                {"P2-frames-live-action.png", "P2 · Expanding frames — Live-action",
                        "Video frames open on a big play button and the",
                        "links that matter: work, services, case studies."},
                {"P3-cards.png", "P3 · Cards with artwork on top",
                        "Video cards lead with a play button; Photography's",
                        "header is a contact sheet of all six types."},
        });
        System.out.println("Wrote concepts to " + dir.getAbsolutePath());
    }
}
