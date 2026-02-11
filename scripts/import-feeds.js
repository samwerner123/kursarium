const fs = require('fs');
const path = require('path');
const axios = require('axios');
const xml2js = require('xml2js');
const csv = require('csv-parser');
const sharp = require('sharp');

// Конфигурация
const CONFIG_PATH = path.join(__dirname, '../data/feeds-config.json');
const DATA_DIR = path.join(__dirname, '../data/courses');
const IMAGES_DIR = path.join(__dirname, '../images/schools');
const META_PATH = path.join(__dirname, '../data/meta.json');

class FeedImporter {
    constructor() {
        this.config = this.loadConfig();
        this.allCourses = [];
        this.schools = new Set();
        this.categories = new Set();
    }

    loadConfig() {
        try {
            const configData = fs.readFileSync(CONFIG_PATH, 'utf8');
            return JSON.parse(configData);
        } catch (error) {
            console.error('❌ Ошибка загрузки конфигурации:', error.message);
            process.exit(1);
        }
    }

    async downloadLogo(url, schoolId) {
        try {
            console.log(`📥 Загрузка логотипа для ${schoolId}...`);
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            
            // Оптимизируем изображение
            const optimized = await sharp(response.data)
                .resize(200, 200, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
                .png()
                .toBuffer();

            const logoPath = path.join(IMAGES_DIR, `${schoolId}.png`);
            fs.writeFileSync(logoPath, optimized);
            
            console.log(`✅ Логотип сохранен: ${logoPath}`);
            return `images/schools/${schoolId}.png`;
        } catch (error) {
            console.error(`❌ Ошибка загрузки логотипа для ${schoolId}:`, error.message);
            return null;
        }
    }

    async parseXMLFeed(feedUrl) {
        try {
            console.log(`📡 Загрузка XML фида: ${feedUrl}`);
            const response = await axios.get(feedUrl);
            const parser = new xml2js.Parser();
            const result = await parser.parseStringPromise(response.data);
            
            // Пример парсинга (адаптируйте под структуру вашего фида)
            const courses = [];
            const items = result.rss?.channel?.[0]?.item || [];
            
            for (const item of items) {
                courses.push({
                    id: item.guid?.[0] || Date.now() + Math.random(),
                    name: item.title?.[0] || 'Без названия',
                    description: item.description?.[0] || '',
                    url: item.link?.[0] || '',
                    price: item.price?.[0] || '0',
                    oldPrice: item.oldPrice?.[0] || null,
                    discount: item.discount?.[0] || null,
                    duration: item.duration?.[0] || '',
                    rating: parseFloat(item.rating?.[0]) || 0,
                    category: item.category?.[0] || 'Прочее',
                    image: item.image?.[0] || ''
                });
            }
            
            return courses;
        } catch (error) {
            console.error(`❌ Ошибка парсинга XML фида:`, error.message);
            return [];
        }
    }

    async parseYMLFeed(feedUrl) {
        try {
            console.log(`📡 Загрузка YML фида: ${feedUrl}`);
            const response = await axios.get(feedUrl);
            const parser = new xml2js.Parser();
            const result = await parser.parseStringPromise(response.data);
            
            const courses = [];
            const offers = result.yml_catalog?.shop?.[0]?.offers?.[0]?.offer || [];
            
            console.log(`📦 Найдено предложений: ${offers.length}`);
            
            for (const offer of offers) {
                const offerId = offer.$.id || Date.now() + Math.random();
                const name = offer.name?.[0] || 'Без названия';
                const url = offer.url?.[0] || '';
                const price = offer.price?.[0] || '0';
                const oldPrice = offer.oldprice?.[0] || null;
                const categoryId = offer.categoryId?.[0];
                const picture = offer.picture?.[0] || '';
                const description = offer.description?.[0] || '';
                
                // Вычисляем скидку
                let discount = null;
                if (oldPrice && price) {
                    const discountPercent = Math.round((1 - parseFloat(price) / parseFloat(oldPrice)) * 100);
                    if (discountPercent > 0) {
                        discount = `${discountPercent}`;
                    }
                }
                
                courses.push({
                    id: offerId,
                    name: name.replace(/<[^>]*>/g, ''), // Удаляем HTML теги
                    description: description.replace(/<[^>]*>/g, ''),
                    url: url,
                    price: price + ' ₽',
                    oldPrice: oldPrice ? oldPrice + ' ₽' : null,
                    discount: discount,
                    duration: '',
                    rating: 0,
                    category: categoryId || 'Прочее',
                    image: picture
                });
            }
            
            return courses;
        } catch (error) {
            console.error(`❌ Ошибка парсинга YML фида:`, error.message);
            return [];
        }
    }

    async parseJSONFeed(feedUrl) {
        try {
            console.log(`📡 Загрузка JSON фида: ${feedUrl}`);
            const response = await axios.get(feedUrl);
            const data = response.data;
            
            // Адаптируйте под структуру вашего JSON фида
            const courses = data.courses || data.items || data;
            
            return courses.map(item => ({
                id: item.id || Date.now() + Math.random(),
                name: item.name || item.title || 'Без названия',
                description: item.description || '',
                url: item.url || item.link || '',
                price: item.price || '0',
                oldPrice: item.oldPrice || item.old_price || null,
                discount: item.discount || null,
                duration: item.duration || '',
                rating: parseFloat(item.rating) || 0,
                category: item.category || 'Прочее',
                image: item.image || ''
            }));
        } catch (error) {
            console.error(`❌ Ошибка парсинга JSON фида:`, error.message);
            return [];
        }
    }

    async parseCSVFeed(feedUrl) {
        try {
            console.log(`📡 Загрузка CSV фида: ${feedUrl}`);
            const response = await axios.get(feedUrl, { responseType: 'stream' });
            
            return new Promise((resolve, reject) => {
                const courses = [];
                response.data
                    .pipe(csv())
                    .on('data', (row) => {
                        courses.push({
                            id: row.id || Date.now() + Math.random(),
                            name: row.name || row.title || 'Без названия',
                            description: row.description || '',
                            url: row.url || row.link || '',
                            price: row.price || '0',
                            oldPrice: row.oldPrice || row.old_price || null,
                            discount: row.discount || null,
                            duration: row.duration || '',
                            rating: parseFloat(row.rating) || 0,
                            category: row.category || 'Прочее',
                            image: row.image || ''
                        });
                    })
                    .on('end', () => resolve(courses))
                    .on('error', reject);
            });
        } catch (error) {
            console.error(`❌ Ошибка парсинга CSV фида:`, error.message);
            return [];
        }
    }

    async importFeed(feed) {
        if (!feed.enabled) {
            console.log(`⏭️  Пропуск отключенного фида: ${feed.name}`);
            return;
        }

        console.log(`\n🔄 Импорт фида: ${feed.name}`);
        console.log(`   URL: ${feed.feedUrl}`);
        console.log(`   Формат: ${feed.feedFormat}`);

        let courses = [];

        // Парсинг в зависимости от формата
        switch (feed.feedFormat.toLowerCase()) {
            case 'xml':
                courses = await this.parseXMLFeed(feed.feedUrl);
                break;
            case 'yml':
                courses = await this.parseYMLFeed(feed.feedUrl);
                break;
            case 'json':
                courses = await this.parseJSONFeed(feed.feedUrl);
                break;
            case 'csv':
                courses = await this.parseCSVFeed(feed.feedUrl);
                break;
            default:
                console.error(`❌ Неподдерживаемый формат: ${feed.feedFormat}`);
                return;
        }

        if (courses.length === 0) {
            console.log(`⚠️  Не найдено курсов в фиде ${feed.name}`);
            return;
        }

        // Загрузка логотипа школы (если есть URL в конфиге)
        let logoPath = feed.logo;
        if (feed.logoUrl) {
            const downloaded = await this.downloadLogo(feed.logoUrl, feed.id);
            if (downloaded) {
                logoPath = downloaded;
            }
        }
        
        // Если логотип не загружен, используем прямую ссылку из конфига
        if (!logoPath || logoPath === 'images/schools/' + feed.id + '.png') {
            logoPath = feed.logo;
        }

        // Добавляем информацию о школе и партнерские параметры
        courses = courses.map(course => ({
            ...course,
            school: feed.name,
            schoolId: feed.id,
            logo: logoPath,
            url: course.url + (feed.affiliateParam || ''),
            importDate: new Date().toISOString()
        }));

        this.allCourses.push(...courses);
        this.schools.add(feed.name);
        courses.forEach(c => this.categories.add(c.category));

        console.log(`✅ Импортировано ${courses.length} курсов из ${feed.name}`);
        
        // Обновляем время последнего обновления
        feed.lastUpdate = new Date().toISOString();
    }

    splitCoursesIntoPages(courses, pageSize = 50) {
        const pages = [];
        for (let i = 0; i < courses.length; i += pageSize) {
            pages.push(courses.slice(i, i + pageSize));
        }
        return pages;
    }

    saveCourses() {
        console.log(`\n💾 Сохранение курсов...`);
        
        // Разбиваем на страницы
        const pageSize = this.config.settings.maxCoursesPerPage || 50;
        const pages = this.splitCoursesIntoPages(this.allCourses, pageSize);

        // Сохраняем каждую страницу
        pages.forEach((page, index) => {
            const pageNumber = index + 1;
            const filePath = path.join(DATA_DIR, `page-${pageNumber}.json`);
            fs.writeFileSync(filePath, JSON.stringify(page, null, 2));
            console.log(`   📄 Страница ${pageNumber}: ${page.length} курсов`);
        });

        // Сохраняем метаданные
        const meta = {
            totalCourses: this.allCourses.length,
            totalSchools: this.schools.size,
            totalPages: pages.length,
            coursesPerPage: pageSize,
            schools: Array.from(this.schools),
            categories: Array.from(this.categories),
            lastUpdate: new Date().toISOString()
        };

        fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2));
        console.log(`\n✅ Сохранено:`);
        console.log(`   📊 Всего курсов: ${meta.totalCourses}`);
        console.log(`   🏫 Школ: ${meta.totalSchools}`);
        console.log(`   📑 Страниц: ${meta.totalPages}`);
        console.log(`   📁 Категорий: ${meta.categories.length}`);

        // Обновляем конфиг с временем последнего обновления
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(this.config, null, 2));
    }

    async run() {
        console.log('🚀 Запуск импорта партнерских фидов...\n');
        console.log(`⏰ Время: ${new Date().toLocaleString('ru-RU')}\n`);

        // Создаем необходимые директории
        [DATA_DIR, IMAGES_DIR].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });

        // Импортируем все фиды
        for (const feed of this.config.feeds) {
            await this.importFeed(feed);
        }

        // Сохраняем результаты
        if (this.allCourses.length > 0) {
            this.saveCourses();
        } else {
            console.log('\n⚠️  Не импортировано ни одного курса!');
        }

        console.log('\n✨ Импорт завершен!\n');
    }
}

// Запуск
const importer = new FeedImporter();
importer.run().catch(error => {
    console.error('💥 Критическая ошибка:', error);
    process.exit(1);
});
