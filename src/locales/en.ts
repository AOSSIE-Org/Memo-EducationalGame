/**
 * English messages: the source of truth for all translations. Every other
 * locale must have exactly these keys and the same {placeholders}
 * (checked by src/lib/i18n.test.ts).
 */
const en = {
  // General
  close: 'Close',
  cancel: 'Cancel',
  save: 'Save',
  delete: 'Delete',
  play: 'Play',
  best: 'Best',
  listen: '{name}: listen',
  shareText: 'Train your memory and learn shapes, colours and capitals with Memo!',
  madeBy: 'made by',

  // Card sets
  chooseCards: 'Choose the cards',
  cardSets: 'Card sets',
  allTopics: 'All topics',
  topics: 'Topics',
  cardCount: 'Cards: {n}',
  notEnoughCards: 'Not enough cards for this game',
  'set.shapes': '2D Geometric Colored Shapes',
  'set.capitals': 'Capitals of the World',
  'tag.geometry': 'Geometry',
  'tag.shapes': 'Shapes',
  'tag.colors': 'Colours',
  'tag.math': 'Mathematics',
  'tag.geography': 'Geography',
  'tag.cities': 'Cities',
  'tag.world': 'World',
  capitalCard: '{capital} ({country})',
  newCardSet: 'New card set',
  importCardSet: 'Load a card set',
  editCardSet: 'Edit card set',
  deleteCardSets: 'Delete card sets',
  deleteCardSet: 'Delete {name}?',
  grownUpsOnlyCards: 'Grown-ups only: solve for {x} to delete this card set.',

  // Game settings
  gameSettings: 'Game settings',
  pairs: 'Number of pairs of cards',
  pairsValue: 'Pairs: {n}',
  showTime: 'Seconds that two different cards stay face up',
  fewerSeconds: 'Fewer seconds',
  moreSeconds: 'More seconds',
  roundsPerPlayer: 'Most rounds in a row per player, while finding pairs',
  fewerRounds: 'Fewer rounds',
  moreRounds: 'More rounds',

  // Playing
  cards: 'Cards',
  faceDownCard: 'Card {n}',
  allPairsFound: 'All pairs found!',
  playAgain: 'Play again',
  pairsFound: 'Pairs found: {n}',

  // Scores
  daysInARow: 'Days in a row',
  gamesCompleted: 'Games finished with these cards',
  roundsInGame: 'Rounds in this game',
  pairsWithSet: 'Pairs found with these cards',
  pairsInAll: 'Pairs found with all cards',
  scoreValue: '{label}: {value}',

  // Menu
  menu: 'Menu',
  playerMenu: '{name}: menu',
  nextPlayers: 'Next players',
  lightMode: 'Light mode',
  darkMode: 'Dark mode',
  editPlayer: 'Edit player',
  statistics: 'Statistics',
  readAloud: 'Read cards aloud',
  readAloudOn: 'Reading cards aloud: on',
  readAloudOff: 'Reading cards aloud: off',
  soundEffects: 'Sound effects',
  soundEffectsOn: 'Sound effects: on',
  soundEffectsOff: 'Sound effects: off',
  language: 'Language',
  share: 'Share',
  linkCopied: 'Link copied',
  saveMyData: 'Save my data',
  installApp: 'Install app',
  credits: 'Credits',
  donate: 'Support AOSSIE with a donation',
  changeCards: 'Change cards',
  switchPlayer: 'Switch player',
  fullScreen: 'Full screen',
  exitFullScreen: 'Exit full screen',

  // Player picker
  whoIsPlaying: 'Who is playing?',
  players: 'Players',
  onePlayer: 'One player',
  severalPlayers: 'Several players',
  newPlayer: 'New player',
  loadPlayer: 'Load a player from a file',
  deletePlayers: 'Delete players',
  'import.tooLarge': 'File too large',
  'import.notJson': 'Not a JSON file',
  'import.notPlayerFile': 'Not a Memo player file',
  'import.unsupportedVersion': 'This file is from a newer version of Memo',
  'import.invalid': 'This file is damaged',
  'import.failed': 'Could not load this file',

  // Player editor
  name: 'Name',
  shape: 'Shape',
  colours: 'Colours',
  otherColour: 'Other colour',

  // Deleting a player
  deletePlayer: 'Delete {name}?',
  grownUpsOnly: 'Grown-ups only: solve for {x} to delete this player and all their progress.',

  // Statistics
  daysPlayed: 'Days played in the last 4 weeks',
  cardSet: 'Card set',

  // Card set editor
  setName: 'Name of the card set',
  addTopic: 'Add a topic',
  removeTopic: 'Remove the topic {name}',
  addPictures: 'Add pictures',
  dropPictures: 'Drop pictures here',
  cardDescription: 'Description of card {n}',
  removeCard: 'Remove card {n}',
  minCards: 'To save: give the card set a name and add pictures (at least {n})',
  skippedFiles: 'Files skipped (not pictures, or too large): {n}',
  tooManyCards: 'Most cards in a card set: {n}',
  textLanguage: 'Language of the texts: {language}',
  saveZip: 'Save as a zip file',
  saveToDrive: 'Save to Google Drive',
  driveNotSetUp: 'Saving to Google Drive is not set up in this copy of Memo',
  driveSaving: 'Saving to Google Drive…',
  driveSaved: 'Saved to Google Drive',
  driveFailed: 'Could not save to Google Drive',

  // Loading a card set
  loadZipFile: 'Load a zip file',
  loadFromLink: 'Load from a link',
  link: 'Link',
  'setImport.tooLarge': 'File too large',
  'setImport.notZip': 'Not a zip file',
  'setImport.noData': 'The zip file has no cardset.json',
  'setImport.invalid': 'This card set is damaged',
  'setImport.unsupportedVersion': 'This card set is from a newer version of Memo',
  'setImport.tooFewCards': 'This card set has too few pictures',
  'setImport.download': 'Could not download this file',

  // Updates and backups
  updateAvailable: 'New version: tap to update',
  updateRequired: 'A newer version of Memo has been used on this device. Tap to update.',
  closeOtherCopies: 'Memo is open in another tab or window. Close it to continue.',
  saveAllPlayers: 'Save all players in one file',

  // Daily reminder (installed app only)
  reminders: 'Daily reminder',
  remindersOn: 'Daily reminder: on',
  remindersOff: 'Daily reminder: off',
  remindersBlocked: 'Notifications are blocked: allow them in the settings of your device',
  reminderBody: '🔥 Keep your streak going! Play Memo today and find more pairs.',

  // Credits page ({placeholders} become links)
  'credits.lead': 'Memo is free and open source software by {aossie}.',
  'credits.source': 'Source code: {link}.',
  'credits.donateTitle': 'Help keep learning free',
  'credits.donateText':
    'AOSSIE is a not-for-profit organization. Memo has no ads, no subscriptions and never collects your data — and we want to keep it that way for every child, everywhere. If Memo has made your children curious about the world, please consider buying us a coffee: every donation, however small, helps us build and maintain more free educational apps. Contributions of code, ideas, translations and feedback are just as welcome!',
  'credits.donateButton': 'Support AOSSIE',
  'credits.data': 'Data',
  'credits.shapes': 'Pictures of shapes: drawn for Memo, free to use like the rest of the app.',
  'credits.capitals': 'Capitals and their photos: from {flagquiz}, which takes them from {wikidata} (CC0) and {commons}.',
  'credits.names': 'Names of countries in other languages: {cldr} ({licence}); names of capitals: {wikidata} (CC0).',
  'credits.photos': 'Photos of capitals',
  'credits.photosNote':
    'All photos are from {commons}, resized and cropped. Follow the links for the originals and the full licence terms.',

  // Installing
  installTheApp: 'Install the app',
  iosShare: 'Share',
  addToHomeScreen: 'Add to Home Screen',
  browserMenu: 'Menu',
};

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;
export default en satisfies Messages;
