export type Language = 'ru' | 'en' | 'uk' | 'pl' | 'de' | 'fr' | 'es';

export const LANGUAGES: Language[] = ['ru', 'en', 'uk', 'pl', 'de', 'fr', 'es'];

type Dictionary = Record<string, string>;

const en: Dictionary = {
  'settings.title': 'Settings',
  'settings.user.title': 'User settings',
  'settings.theme': 'Theme',
  'settings.language': 'Language',
  'settings.layout': 'Layout',
  'settings.readTtl': 'Keep read markers (days)',
  'settings.font.feeds': 'Feeds font size',
  'settings.font.headlines': 'Headlines font size',
  'settings.font.content': 'Content font size',
  'settings.write': 'Write',
  'settings.unsaved': 'Changes not saved',
  'settings.saved': 'Settings saved.',
  'settings.saveError': 'Could not save settings.',
  'theme.light': 'Light',
  'theme.dark': 'Dark',
  'theme.system': 'System',
  'layout.three': 'Three panels',
  'layout.list': 'List',
  'layout.split': 'Split',
  'reader.search': 'Search...',
  'reader.refresh': 'Refresh',
  'reader.refreshing': 'Refreshing',
  'reader.shown': 'shown',
  'reader.unread': 'unread',
  'reader.unknownFeed': 'Unknown feed',
  'reader.feeds': 'Feeds',
  'reader.allFeeds': 'All feeds',
  'reader.headlines': 'Headlines',
  'reader.shortcuts': 'Keyboard shortcuts',
  'reader.fullText': 'Full text',
  'reader.markRead': 'Mark read',
  'reader.markUnread': 'Mark unread',
  'reader.delete': 'Delete',
  'reader.deleted': 'Item deleted',
  'reader.undo': 'Undo',
};

const ru: Dictionary = {
  'settings.title': 'Настройки',
  'settings.user.title': 'Настройки пользователя',
  'settings.theme': 'Тема',
  'settings.language': 'Язык',
  'settings.layout': 'Раскладка',
  'settings.readTtl': 'Хранить прочитанное (дней)',
  'settings.font.feeds': 'Размер шрифта фидов',
  'settings.font.headlines': 'Размер шрифта заголовков',
  'settings.font.content': 'Размер шрифта контента',
  'settings.write': 'Сохранить',
  'settings.unsaved': 'Изменения не сохранены',
  'settings.saved': 'Настройки сохранены.',
  'settings.saveError': 'Не удалось сохранить настройки.',
  'theme.light': 'Светлая',
  'theme.dark': 'Тёмная',
  'theme.system': 'Системная',
  'layout.three': 'Три панели',
  'layout.list': 'Список',
  'layout.split': 'Разделённая',
  'reader.search': 'Поиск...',
  'reader.refresh': 'Обновить',
  'reader.refreshing': 'Обновление',
  'reader.shown': 'показано',
  'reader.unread': 'непрочитано',
  'reader.unknownFeed': 'Неизвестный фид',
  'reader.feeds': 'Фиды',
  'reader.allFeeds': 'Все фиды',
  'reader.headlines': 'Заголовки',
  'reader.shortcuts': 'Горячие клавиши',
  'reader.fullText': 'Полный текст',
  'reader.markRead': 'Прочитано',
  'reader.markUnread': 'Не прочитано',
  'reader.delete': 'Удалить',
  'reader.deleted': 'Элемент удалён',
  'reader.undo': 'Отменить',
};

const uk: Dictionary = {
  'settings.title': 'Налаштування',
  'settings.user.title': 'Налаштування користувача',
  'settings.theme': 'Тема',
  'settings.language': 'Мова',
  'settings.layout': 'Розкладка',
  'settings.readTtl': 'Зберігати прочитане (днів)',
  'settings.write': 'Зберегти',
  'settings.unsaved': 'Зміни не збережено',
  'settings.saved': 'Налаштування збережено.',
  'theme.light': 'Світла',
  'theme.dark': 'Темна',
  'theme.system': 'Системна',
  'reader.search': 'Пошук...',
  'reader.refresh': 'Оновити',
  'reader.unread': 'непрочитано',
};

const pl: Dictionary = {
  'settings.title': 'Ustawienia',
  'settings.user.title': 'Ustawienia użytkownika',
  'settings.theme': 'Motyw',
  'settings.language': 'Język',
  'settings.layout': 'Układ',
  'settings.readTtl': 'Przechowuj przeczytane (dni)',
  'settings.write': 'Zapisz',
  'settings.unsaved': 'Zmiany niezapisane',
  'settings.saved': 'Ustawienia zapisane.',
  'theme.light': 'Jasny',
  'theme.dark': 'Ciemny',
  'theme.system': 'Systemowy',
  'reader.search': 'Szukaj...',
  'reader.refresh': 'Odśwież',
  'reader.unread': 'nieprzeczytane',
};

const de: Dictionary = {
  'settings.title': 'Einstellungen',
  'settings.user.title': 'Benutzereinstellungen',
  'settings.theme': 'Thema',
  'settings.language': 'Sprache',
  'settings.layout': 'Layout',
  'settings.readTtl': 'Gelesenes behalten (Tage)',
  'settings.write': 'Speichern',
  'settings.unsaved': 'Änderungen nicht gespeichert',
  'settings.saved': 'Einstellungen gespeichert.',
  'theme.light': 'Hell',
  'theme.dark': 'Dunkel',
  'theme.system': 'System',
  'reader.search': 'Suchen...',
  'reader.refresh': 'Aktualisieren',
  'reader.unread': 'ungelesen',
};

const fr: Dictionary = {
  'settings.title': 'Paramètres',
  'settings.user.title': 'Paramètres utilisateur',
  'settings.theme': 'Thème',
  'settings.language': 'Langue',
  'settings.layout': 'Disposition',
  'settings.readTtl': 'Conserver le lu (jours)',
  'settings.write': 'Enregistrer',
  'settings.unsaved': 'Modifications non enregistrées',
  'settings.saved': 'Paramètres enregistrés.',
  'theme.light': 'Clair',
  'theme.dark': 'Sombre',
  'theme.system': 'Système',
  'reader.search': 'Rechercher...',
  'reader.refresh': 'Rafraîchir',
  'reader.unread': 'non lus',
};

const es: Dictionary = {
  'settings.title': 'Ajustes',
  'settings.user.title': 'Ajustes de usuario',
  'settings.theme': 'Tema',
  'settings.language': 'Idioma',
  'settings.layout': 'Diseño',
  'settings.readTtl': 'Conservar leídos (días)',
  'settings.write': 'Guardar',
  'settings.unsaved': 'Cambios sin guardar',
  'settings.saved': 'Ajustes guardados.',
  'theme.light': 'Claro',
  'theme.dark': 'Oscuro',
  'theme.system': 'Sistema',
  'reader.search': 'Buscar...',
  'reader.refresh': 'Actualizar',
  'reader.unread': 'no leídos',
};

const dictionaries: Record<Language, Dictionary> = {en, ru, uk, pl, de, fr, es};

let currentLanguage: Language = detectLanguage();
const listeners = new Set<() => void>();

function detectLanguage(): Language {
  const stored = localStorage.getItem('rss-language') as Language | null;
  if (stored && LANGUAGES.includes(stored)) {
    return stored;
  }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase() as Language;
  return LANGUAGES.includes(nav) ? nav : 'en';
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function setLanguage(language: Language) {
  if (!LANGUAGES.includes(language) || language === currentLanguage) {
    return;
  }
  currentLanguage = language;
  localStorage.setItem('rss-language', language);
  document.documentElement.lang = language;
  listeners.forEach((listener) => listener());
}

export function subscribeI18n(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function t(key: string, params?: Record<string, string | number>): string {
  const template = dictionaries[currentLanguage][key] ?? en[key] ?? key;
  if (!params) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`));
}

document.documentElement.lang = currentLanguage;

window.addEventListener('storage', (event) => {
  if (event.key !== 'rss-language') {
    return;
  }
  const next = event.newValue as Language | null;
  if (next && LANGUAGES.includes(next) && next !== currentLanguage) {
    currentLanguage = next;
    document.documentElement.lang = next;
    listeners.forEach((listener) => listener());
  }
});
