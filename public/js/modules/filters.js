const pagination = 10;
const dbPagination = 100;

var loaded = false;

// URL

function setUrlParameter(paramater, value) {
    if (paramater == "" || paramater == undefined || paramater == null) return;
    let url = new URL(window.location.href);
    url.searchParams.set(paramater, value);
    history.replaceState({}, "Title", url.toString());
}

function switchPageWithParameters(subpage) {
    window.location = subpage + document.location.search;
}

// Pagination

var pagesLocked = false;
var previousMinPage;
var previousMaxPage;

function lockPages() {
    if (pagesLocked) return;
    pagesLocked = true;
    let pageField = document.getElementById("pageField");
    previousMinPage = pageField.min;
    previousMaxPage = pageField.max;
    pageField.min = pageField.value;
    pageField.max = pageField.value;
}

function unlockPages() {
    if (!pagesLocked) return;
    pagesLocked = false;
    let pageField = document.getElementById("pageField");
    pageField.min = previousMinPage;
    pageField.max = previousMaxPage;
}

function updateLastPage(lastPage) {
    const pageCountElement = document.getElementById("pageCount");
    let text = pageCountElement.innerHTML.split(" ");
    text[text.length-1] = lastPage
    pageCountElement.innerHTML = text.join(" ");
    if (pagesLocked) previousMaxPage = lastPage;
    else document.getElementById("pageField").max = lastPage;
}

// Fields

function changeValue(input, change=0, apply=true, reload=true) {
    let currentValue;
    if (input.type != "hidden" && input.type != "text") {
        currentValue = parseFloat(input.value);
        if (isNaN(currentValue)) currentValue = 0;
        currentValue += change;
        if (currentValue < input.min) currentValue = input.min;
        else if (currentValue > input.max) currentValue = input.max;
        input.value = currentValue;
        changeInputWidth(input);
    }

    if (apply) setUrlParameter(input.name, input.value);

    if (input.name != "page") {
        const pageField = document.getElementById("pageField");
        pageField.value = 1;
        changeInputWidth(pageField);
    }

    if (loaded && apply && reload) getOffers();
}

function changeInputWidth(input) {
    if (input.value.length > 5) input.value = input.value.substring(0, 5);
    input.style.width = `${2+.4*input.value.length}em`;
}

// Sliders

function upperSliderChange (elements, correction) {
    elements.upperField.value = elements.upperSlider.value / correction;
    upperFieldChange(elements, correction, true);
}
function lowerSliderChange (elements, correction) {
    elements.lowerField.value = elements.lowerSlider.value / correction;
    lowerFieldChange(elements, correction, true);
}
function upperFieldChange (elements, correction, sliderChange = false) {
    changeValue(elements.upperField, 0, false);
    elements.upperSlider.value = elements.upperField.value * correction;
    elements.lowerField.max = elements.upperField.value;
    changeValue(elements.lowerField, 0, false);
    elements.lowerSlider.value = elements.lowerField.value * correction;
    if (!sliderChange) {
        setUrlParameter(elements.upperField.name, elements.upperField.value);
        setUrlParameter(elements.lowerField.name, elements.lowerField.value);
    }
}
function lowerFieldChange (elements, correction, sliderChange = false) {
    changeValue(elements.lowerField, 0, false);
    elements.lowerSlider.value = elements.lowerField.value * correction;
    elements.upperField.min = elements.lowerField.value;
    changeValue(elements.upperField, 0, false);
    elements.upperSlider.value = elements.upperField.value * correction;
    if (!sliderChange) {
        setUrlParameter(elements.upperField.name, elements.upperField.value);
        setUrlParameter(elements.lowerField.name, elements.lowerField.value);
    }
}

function initRange(name, min, max, step, correction) {
    let elements = {};

    elements.upperSlider = document.getElementById(`filterInput${name}UpperSlider`);
    elements.lowerSlider = document.getElementById(`filterInput${name}LowerSlider`);
    elements.upperField = document.getElementById(`filterInput${name}UpperField`);
    elements.lowerField = document.getElementById(`filterInput${name}LowerField`);
    elements.upperSlider.max = max * correction;
    elements.lowerSlider.max = max * correction;
    elements.upperSlider.min = min * correction;
    elements.lowerSlider.min = min * correction;
    elements.upperField.max = max;
    elements.lowerField.max = max;
    elements.upperField.min = min;
    elements.lowerField.min = min;
    elements.upperField.value = max * correction;
    elements.lowerField.value = min * correction;
    elements.upperSlider.step = step * correction;
    elements.lowerSlider.step = step * correction;

    return elements;
}

function readyRange(elements, correction) {
    elements.lowerField.max = elements.upperField.value;
    elements.upperField.min = elements.lowerField.value;
    elements.upperSlider.value = elements.upperField.value * correction;
    elements.lowerSlider.value = elements.lowerField.value * correction;
    changeInputWidth(elements.upperField);
    changeInputWidth(elements.lowerField);
    elements.upperSlider.addEventListener("input", () => upperSliderChange(elements, correction));
    elements.lowerSlider.addEventListener("input", () => lowerSliderChange(elements, correction));
    elements.upperSlider.addEventListener("change", () => changeValue(elements.upperField));
    elements.lowerSlider.addEventListener("change", () => changeValue(elements.lowerField));
    elements.upperField.addEventListener("change", () => upperFieldChange(elements, correction));
    elements.lowerField.addEventListener("change", () => lowerFieldChange(elements, correction));
}

// Calendar (i know the code isn't pretty, but i'm really under time pressure here!)

calendarDayElements = [];

var viewMonth;
var viewYear;

var selectingBegin;
var beginDate;
var endDate;

function openCalendar(field) {
    const today = new Date();
    viewMonth = today.getUTCMonth();
    viewYear = today.getUTCFullYear();

    selectingBegin = true;

    renderCalendar();

    const calendar = document.getElementById("inputCalendar");
    field.addEventListener("click", () => {
        if (field.getBoundingClientRect().top < window.innerHeight / 2) {
            calendar.classList.add("popupUp");
            calendar.classList.remove("popupDown");
        } else {
            licalendarst.classList.remove("popupUp");
            calendar.classList.add("popupDown");
        }
        calendar.classList.add("visible");
    });

    calendar.classList.add("visible");
}

function closeCalendar() {
    document.getElementById("inputCalendar").classList.remove("visible");
    const beginElement = document.getElementById("filterInputDateBegin");
    beginElement.value = beginDate.toISOString();
    changeValue(beginElement, reload=false);
    const endElement = document.getElementById("filterInputDateEnd");
    endElement.value = endDate.toISOString();
    changeValue(endElement, reload=false);
}

function hoverDay(hoverDay, hoverMonth, hoverYear) {
    setDay(hoverDay, hoverMonth, hoverYear);
}

function clickDay(clickDay, clickMonth, clickYear) {
    setDay(clickDay, clickMonth, clickYear);
    if (selectingBegin) selectingBegin = false;
    else closeCalendar();
}

function setDay(setDay, setMonth, setYear) {
    if (selectingBegin) beginDate = new Date(setYear, setMonth, setDay);
    else {
        let setDate = new Date(setYear, setMonth, setDay);
        if (setDate < beginDate) setDate = beginDate;
        endDate = setDate
    }
    updateCalendarResult();
}

function updateCalendarResult() {
    const calendarResultField = document.getElementById("filterInputDateField");
    calendarResultField.innerHTML = beginDate.toLocaleDateString() + (selectingBegin ? "" : ` - ${endDate.toLocaleDateString()}`);
}

function calendarLeft() {
    --viewMonth;
    if (viewMonth == -1) {
        viewMonth = 11
        --viewYear;
    }
    renderCalendar();
}

function calendarRight() {
    ++viewMonth;
    if (viewMonth == 12) {
        viewMonth = 0
        ++viewYear;
    }
    renderCalendar();
}

function renderCalendar() {
    const calendar = document.getElementById("inputCalendar");

    document.getElementById("inputCalendarMonth").innerHTML = `${viewMonth+1} ${viewYear}`;

    for (let dayElement of calendarDayElements) dayElement.remove();
    calendarDayElements = [];

    const dayCount = new Date(viewYear, viewMonth + 1, 0).getDate();
    let dayOffset = new Date(viewYear, viewMonth, 1).getDay() - 1;

    if (dayOffset == -1) dayOffset = 6;
    if (dayOffset != 0) {
        const offsetElement = document.createElement("span");
        offsetElement.classList.add("inputCalendarOffest");
        offsetElement.style = `--offset:${dayOffset+1}`;
        calendar.appendChild(offsetElement);
        calendarDayElements.push(offsetElement)
    }

    for (let i = 1; i <= dayCount; ++i) {
        const dayElement = document.createElement("span");
        dayElement.classList.add("inputCalendarDay");
        dayElement.innerHTML = i;
        //if ((i + viewOffset - 1) % 7 == 0 || i == 1) day.classList.add("start");
        //else if ((i + viewOffset) % 7 == 0 || i == viewCount) day.classList.add("end");
        dayElement.addEventListener("mouseenter", () => hoverDay(i, viewMonth, viewYear));
        dayElement.addEventListener("click", () => clickDay(i, viewMonth, viewYear));
        calendar.appendChild(dayElement);
        calendarDayElements.push(dayElement);
    }
}

// Selects

function selectValue(container, option) {
    container.children[0].innerHTML = option.innerHTML;
    container.children[1].value = option.value;
    container.children[2].classList.remove("visible");
    changeValue(container.children[1]);
}

function initSelects(container) {
    const field = container.children[0];
    const input = container.children[1];
    const list = container.children[2];
    field.addEventListener("click", () => {
        if (list.classList.contains("visible")) list.classList.remove("visible");
        else {
            if (field.getBoundingClientRect().top < window.innerHeight / 2) {
                list.classList.add("popupUp");
                list.classList.remove("popupDown");
            } else {
                list.classList.remove("popupUp");
                list.classList.add("popupDown");
            }
            list.classList.add("visible");
        }
    });
    for (let option of list.children) option.addEventListener("click", () => selectValue(container, option));
    let startSelection = list.children[0];
    if (input.value != undefined && input.value != "") {
        for (let option of list.children) {
            if (option.value == input.value) {
                startSelection = option;
                break;
            }
        }
    }
    selectValue(container, startSelection);
}

// Init

var airports;
var airportsMap;
var rooms;
var roomsMap;
var meals;
var mealsMap;

window.addEventListener("load", async () => {
    const url = new URL(window.location.href);

    const priceRange = initRange("Price", 0, 10000, 100, 1);
    const startRange = initRange("Stars", 1, 5, .5, 2);

    for (let input of document.getElementsByClassName("filterInput")) {
        if (input.type == "number") {
            input.addEventListener("input", () => changeInputWidth(input));
            input.addEventListener("change", () => changeValue(input));
            for (let button of input.parentElement.getElementsByClassName("filterButton")) button.addEventListener("click", () => changeValue(input, parseInt(button.value)))
        }
        if (input.type == "text") {
            input.addEventListener("change", () => changeValue(input));
        }
        if (input.name != undefined) {
            const urlValue = url.searchParams.get(input.name);
            if (urlValue != "" && urlValue != undefined) input.value = urlValue;
        }
        if (input.type != "range") changeValue(input, apply=false);
    }

    readyRange(priceRange, 1);
    readyRange(startRange, 2);

    document.getElementById("filtersButtonOpen").addEventListener("click", () => document.getElementsByClassName("mainFilters")[0].classList.remove("hidden"));
    document.getElementById("filtersButtonClose").addEventListener("click", () => document.getElementsByClassName("mainFilters")[0].classList.add("hidden"));

    document.getElementById("filterButtonSubmit").addEventListener("click", () => {
        document.getElementsByClassName("mainFilters")[0].classList.add("hidden");
        getOffers();
    });

    const initBeginDate = document.getElementById("filterInputDateBegin").value;
    const initEndDate = document.getElementById("filterInputDateEnd").value;
    if (initBeginDate != 0 && initBeginDate != "" && initBeginDate != undefined && initEndDate != 0 && initEndDate != "" && initEndDate != undefined) {
        beginDate = new Date(initBeginDate);
        endDate = new Date(initEndDate);
        updateCalendarResult();
    }

    const dateField = document.getElementById("filterInputDateField");
    dateField.addEventListener("click", () => openCalendar(dateField));
    document.getElementById("inputCalendarLeft").addEventListener("click", () => calendarLeft());
    document.getElementById("inputCalendarRight").addEventListener("click", () => calendarRight());

    airports = await new Promise(resolve => socket.emit("getAirports", {}, result => resolve(result)));
    airportsMap = {};
    for (let airport of airports) airports[airport.id] = airport.name;
    const airportList = document.getElementById("airportList");
    for (let airport of airports) {
        if (airport.home) {
            const option = document.createElement("option");
            option.value = airport.id;
            option.innerHTML = airport.name;
            airportList.appendChild(option);
        }
    }

    rooms = await new Promise(resolve => socket.emit("getRooms", {}, result => resolve(result)));
    roomsMap = {};
    for (let room of rooms) rooms[room.id] = room.id;
    const roomList = document.getElementById("roomList");
    for (let room of rooms) {
        const option = document.createElement("option");
        option.value = room.id;
        option.innerHTML = room.id; // lang needed
        roomList.appendChild(option);
    }

    meals = await new Promise(resolve => socket.emit("getMeals", {}, result => resolve(result)));
    mealsMap = {};
    for (let meal of meals) meals[meal.id] = meal.id;
    const mealList = document.getElementById("mealList");
    for (let meal of meals) {
        const option = document.createElement("option");
        option.value = meal.id;
        option.innerHTML = meal.id; // lang needed
        mealList.appendChild(option);
    }
    
    for (let select of document.getElementsByClassName("filterInputSelectDiv")) initSelects(select);

    getOffers();

    loaded = true;
});