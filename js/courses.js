// Загрузка и отображение курсов из JSON
(async function() {
    try {
        // Загружаем метаданные
        const metaResponse = await fetch('data/meta.json');
        const meta = await metaResponse.json();
        
        // Обновляем статистику на главной
        updateStats(meta);
        
        // Загружаем первую страницу курсов
        const coursesResponse = await fetch('data/courses/page-1.json');
        const courses = await coursesResponse.json();
        
        // Отображаем курсы на главной (первые 4)
        renderCourses(courses.slice(0, 4));
        
        console.log('✅ Загружено курсов:', courses.length);
        console.log('📊 Всего в базе:', meta.totalCourses);
    } catch (error) {
        console.error('❌ Ошибка загрузки курсов:', error);
        // Если нет импортированных данных, показываем статические курсы
    }
})();

function updateStats(meta) {
    // Обновляем статистику в hero секции
    const totalCoursesEl = document.querySelector('.hero-stat-value');
    if (totalCoursesEl && meta.totalCourses > 0) {
        totalCoursesEl.textContent = meta.totalCourses.toLocaleString('ru-RU') + '+';
    }
    
    const totalSchoolsEl = document.querySelectorAll('.hero-stat-value')[1];
    if (totalSchoolsEl && meta.totalSchools > 0) {
        totalSchoolsEl.textContent = meta.totalSchools + '+';
    }
}

function renderCourses(courses) {
    const coursesGrid = document.querySelector('.courses-grid');
    if (!coursesGrid || courses.length === 0) return;
    
    // Очищаем существующие курсы
    coursesGrid.innerHTML = '';
    
    courses.forEach(course => {
        const courseCard = createCourseCard(course);
        coursesGrid.appendChild(courseCard);
    });
}

function createCourseCard(course) {
    const card = document.createElement('a');
    card.href = course.url;
    card.className = 'course-card';
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    
    // Определяем есть ли скидка
    const hasDiscount = course.discount && parseInt(course.discount) > 0;
    
    card.innerHTML = `
        <div class="course-image">
            ${hasDiscount ? '<div class="course-badge">Хит</div>' : ''}
            <div class="course-school">
                ${course.logo ? `<img src="${course.logo}" class="course-school-logo" alt="${course.school}">` : '<div class="course-school-logo"></div>'}
                ${course.school}
            </div>
        </div>
        <div class="course-content">
            <h3 class="course-title">${course.name}</h3>
            <div class="course-meta">
                ${course.rating > 0 ? `
                    <span class="course-rating">
                        <svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                        ${course.rating}
                    </span>
                    <span>•</span>
                ` : ''}
                ${course.duration ? `<span>${course.duration}</span>` : '<span>Онлайн-курс</span>'}
            </div>
            <div class="course-price-row">
                <span class="course-price">${course.price}</span>
                ${course.oldPrice ? `
                    <span class="course-price-old">${course.oldPrice}</span>
                    ${course.discount ? `<span class="course-price-discount">-${course.discount}%</span>` : ''}
                ` : ''}
            </div>
        </div>
    `;
    
    return card;
}

// Функция для загрузки всех курсов (для страницы каталога)
async function loadAllCourses() {
    try {
        const metaResponse = await fetch('data/meta.json');
        const meta = await metaResponse.json();
        
        const allCourses = [];
        
        for (let i = 1; i <= meta.totalPages; i++) {
            const response = await fetch(`data/courses/page-${i}.json`);
            const courses = await response.json();
            allCourses.push(...courses);
        }
        
        return allCourses;
    } catch (error) {
        console.error('❌ Ошибка загрузки всех курсов:', error);
        return [];
    }
}
