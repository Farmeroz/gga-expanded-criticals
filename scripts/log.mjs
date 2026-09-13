const prefix = 'gga-expanded-criticals |';

export function error(...details) {
  console.error(prefix, ...details);
}

export function warn(...details) {
  console.warn(prefix, ...details);
}

export function info(...details) {
  console.info(prefix, ...details);
}
