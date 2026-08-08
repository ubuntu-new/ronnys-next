# Ronny's Admin — ჩადგმის ინსტრუქცია

ეს არქივი შეიცავს `/admin` პანელის სრულ საფუძველს.
გახსენი **repo-ს root-ში** — ფაილები სწორ ადგილას ჩაჯდება.

## ფაილები

| ფაილი | დანიშნულება |
|---|---|
| `middleware.ts` | **ჩაანაცვლებს არსებულს** — /admin გამოირიცხა locale-რედირექტიდან + სესიის შემოწმება |
| `lib/db.ts` | Prisma client singleton |
| `lib/admin-auth.ts` | სესია (JWT cookie), როლები, უფლებები |
| `lib/admin-utils.ts` | {en,ka} და Decimal დამხმარეები |
| `app/admin/layout.tsx` | admin shell + გვერდითი მენიუ |
| `app/admin/admin.css` | admin-ის სტილები |
| `app/admin/actions.ts` | server actions: login/logout/პროდუქტის შენახვა |
| `app/admin/login/page.tsx` | შესვლის გვერდი |
| `app/admin/page.tsx` | დაფა (ცოცხალი ციფრები ბაზიდან) |
| `app/admin/products/page.tsx` | პროდუქტების სია + ფილტრი |
| `app/admin/products/[id]/page.tsx` | პროდუქტის რედაქტირება |
| `scripts/create-admin.mjs` | პირველი super_admin-ის შექმნა |

## ნაბიჯები (სერვერზე)

```bash
cd /srv/ronnys-next

# 1. დამოკიდებულებები
npm install jose bcryptjs
npm install -D @types/bcryptjs

# 2. AUTH_SECRET (სესიის ხელმოწერის გასაღები)
echo "AUTH_SECRET=\"$(openssl rand -base64 48)\"" >> .env

# 3. პირველი ადმინი — შეცვალე სახელი/ფოსტა/პაროლი
node scripts/create-admin.mjs "Levan" levan@ronnys.ge "შენი-გრძელი-პაროლი"

# 4. აწყობა და გაშვება
npm run build && systemctl restart ronnys
```

მერე გახსენი: **https://ronnys.webertela.online/admin**

## შენიშვნები

- `@/` alias `tsconfig.json`-ში უნდა იყოს (`"paths": { "@/*": ["./*"] }`). თუ არაა, დაამატე.
- საიტის საჯარო ნაწილი უცვლელია — ისევ `lib/data.ts`-იდან მუშაობს.
- `AUTH_SECRET` **არ committ-დება** (.env gitignore-შია).
