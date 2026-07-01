const getHindiDay = (dayEn) => {
  const days = {
    Monday: "सोमवार",
    Tuesday: "मंगलवार",
    Wednesday: "बुधवार",
    Thursday: "गुरुवार",
    Friday: "शुक्रवार",
    Saturday: "शनिवार",
    Sunday: "रविवार",
  };
  return days[dayEn];
};

const getHindiMonth = (monthEn) => {
  const months = {
    January: "जनवरी",
    February: "फरवरी",
    March: "मार्च",
    April: "अप्रैल",
    May: "मई",
    June: "जून",
    July: "जुलाई",
    August: "अगस्त",
    September: "सितंबर",
    October: "अक्टूबर",
    November: "नवंबर",
    December: "दिसंबर",
  };
  return months[monthEn];
};

// Offset dates from today in IST timezone
const getDateOffset = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);

  const formatterOptions = {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "long",
    year: "numeric",
    weekday: "long",
  };
  
  // Create an Intl.DateTimeFormat object to easily extract components in English
  const dtFormatter = new Intl.DateTimeFormat("en-US", formatterOptions);
  const parts = dtFormatter.formatToParts(d);
  
  const extract = (type) => parts.find(p => p.type === type).value;
  
  const dayName = extract('weekday');
  const monthName = extract('month');
  const dateNum = extract('day');
  const yearNum = extract('year');

  const enDate = `${dateNum.padStart(2, '0')} ${monthName} ${yearNum}, ${dayName}`;
  const hiDate = `${dateNum.padStart(2, '0')} ${getHindiMonth(monthName)} ${yearNum}, ${getHindiDay(dayName)}`;

  return { en: enDate, hi: hiDate };
};

const getDates = () => {
  const yesterday = getDateOffset(-1);
  const today = getDateOffset(0);
  const tomorrow = getDateOffset(1);

  return {
    TODAY_EN: today.en,
    TODAY_HI: today.hi,
    YESTERDAY_EN: yesterday.en,
    YESTERDAY_HI: yesterday.hi,
    TOMORROW_EN: tomorrow.en,
    TOMORROW_HI: tomorrow.hi,
  };
};

const replacePlaceholders = (text) => {
  if (!text) return text;
  const dates = getDates();
  let newText = text;
  for (const [key, value] of Object.entries(dates)) {
    newText = newText.replace(new RegExp(`{${key}}`, "g"), value);
  }
  return newText;
};

module.exports = {
  getDates,
  replacePlaceholders,
};
