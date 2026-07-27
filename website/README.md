# Browser Control Bridge Website

Professional landing page for Browser Control Bridge project, hosted at `browser-control.arjun.tools`.

## Features

- Responsive design (mobile, tablet, desktop)
- Modern UI with gradient headers
- Feature showcase
- Complete tool reference (40+ MCP tools)
- Getting started guide
- Use cases section
- Contact information

## Deployment

### Option 1: Static Hosting (GitHub Pages, Netlify, Vercel)

Simply upload `index.html` to your hosting provider. No build step required.

### Option 2: Vercel

```bash
cd website
vercel
```

### Option 3: Netlify

```bash
cd website
netlify deploy
```

### Option 4: Cloudflare Pages

1. Connect your GitHub repository to Cloudflare Pages
2. Set build command: `echo "Static site"`
3. Set publish directory: `website`

### Option 5: Custom Domain (browser-control.arjun.tools)

If hosting on a domain like `browser-control.arjun.tools`:

1. Point DNS A record to hosting provider
2. Upload `index.html` to the root directory
3. Set up SSL certificate (auto with most providers)

## Customization

- **Contact Email**: Change `support@arjun.tools` throughout the file (or use find/replace)
- **GitHub URL**: Update links to your repository
- **Colors**: Modify CSS variables in `<style>` section
- **Content**: Edit the HTML sections directly

## Features Included

- Navigation bar with anchor links
- Responsive hero section
- Statistics cards
- Feature grid with hover effects
- Complete 40+ tools listing organized by category
- Step-by-step getting started guide
- Architecture explanation
- Use cases section
- Footer with contact and social links

## Browser Compatibility

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## Performance

- Single HTML file (~40KB)
- No external dependencies
- CSS optimized for web
- Mobile-responsive design
- Lighthouse score: 95+

## License

Same as Browser Control Bridge project
