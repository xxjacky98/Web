function isValidIsoDateYmd(value) {
  if (typeof value !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const asDate = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(asDate.getTime());
}

function parsePositiveInt(value) {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isInteger(n)) return n;
  }
  return null;
}

function parsePositiveNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

module.exports = {
  isValidIsoDateYmd,
  parsePositiveInt,
  parsePositiveNumber,
};
