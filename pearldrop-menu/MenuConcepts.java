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

    // ---------- overview sheet ----------
    static void overview(File dir, String[][] concepts) throws Exception {
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
        g.drawString("pearldrop.com v3 — menu concepts", 64, 96);
        g.setFont(font("Inter-Regular", 16f));
        g.setColor(white(160));
        g.drawString("Five directions for the About us menu. Same pages throughout; legal links move to the footer.", 64, 130);

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
        ImageIO.write(out, "png", new File(dir, "00-overview.png"));
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

        overview(dir, new String[][]{
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
        System.out.println("Wrote concepts to " + dir.getAbsolutePath());
    }
}
