export const formatDateES = (dateString: string | null): string => {
  if (!dateString) return "-";
  
  try {
    // Extraer solo la parte de fecha (YYYY-MM-DD)
    const dateOnly = dateString.split('T')[0];
    const [year, month, day] = dateOnly.split('-');
    return `${day}/${month}/${year}`;
  } catch (e) {
    return "-";
  }
};