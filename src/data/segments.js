export const SEGMENTS = [
  { id: 1, label: 'STICKER', type: 'prize', colorClass: 'dark', imagename: 'sticker.jpeg' },
  { id: 2, label: 'NOTE PAD & PEN', type: 'prize', colorClass: 'light', imagename: 'notepadandpen.jpeg' },
  { id: 3, label: 'TRY AGAIN', type: 'loss', colorClass: 'dark', imagename: 'tryagain.jpeg' },
  { id: 4, label: 'TOTE BAG', type: 'prize', colorClass: 'light', imagename: 'totebag.jpeg' },
  { id: 5, label: 'KEY HOLDER', type: 'prize', colorClass: 'dark', imagename: 'keyholder.jpeg' },
  { id: 6, label: 'OOPS! BETTER LUCK', type: 'loss', colorClass: 'light', imagename: 'oops.jpeg' },
  { id: 7, label: 'TRY AGAIN', type: 'loss', colorClass: 'dark', imagename: 'tryagain.jpeg' },
];

export function getRandomSegment() {
  return SEGMENTS[Math.floor(Math.random() * SEGMENTS.length)];
}

export function getSegmentIndex(segmentId) {
  return SEGMENTS.findIndex((segment) => segment.id === segmentId);
}
