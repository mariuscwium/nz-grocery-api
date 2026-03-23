# New World Category Research

## Source
- Site: https://www.newworld.co.nz
- Category sitemap: https://www.newworld.co.nz/ecom_sitemap_categories.xml
- URL pattern: `https://www.newworld.co.nz/shop/category/{slug}?pg=1`
- Product URL pattern: `https://www.newworld.co.nz/shop/product/{id}_ea_000nw?name={name}`
- Shop pages return 403 to automated requests — will need browser-based scraping or API discovery

## Confirmed top-level categories (from sitemap, truncated at 9)

1. Baby and Toddler — `/shop/category/baby-and-toddler`
2. Bakery — `/shop/category/bakery`
3. Beer, Wine and Cider — `/shop/category/beer-wine-and-cider`
4. Fridge, Deli and Eggs — `/shop/category/fridge-deli-and-eggs`
5. Frozen — `/shop/category/frozen`
6. Fruit and Vegetables — `/shop/category/fruit-and-vegetables`
7. Health and Body — `/shop/category/health-and-body`
8. Hot and Cold Drinks — `/shop/category/hot-and-cold-drinks`
9. Household and Cleaning — `/shop/category/household-and-cleaning`

## Likely missing categories (sitemap was truncated)

- Meat and Seafood
- Pantry (rice, pasta, canned goods, sauces, oils, baking)
- Snacks and Confectionery
- International Foods
- Pet Food
- Kitchen and Dining

## Subcategory depth

Each top-level category has 5-20 subcategories. e.g. Fruit and Vegetables has:
- Fresh Salad & Herbs
- Fruit (11 types: apples, bananas, berries, citrus, etc.)
- Vegetables (14 types: potatoes, onions, carrots, etc.)
- Organic sections

## Access notes

- Shop pages (HTML) return 403 to non-browser requests
- Sitemaps are publicly accessible
- Product sitemaps have no category info in URLs (just product ID + name)
- Pagination via `?pg=N` query param
- Will need to investigate: browser automation (Playwright), or hidden JSON API behind the frontend
