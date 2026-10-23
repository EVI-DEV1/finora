export function todayInBrazil(now=new Date()){
const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(part=>[part.type,part.value]));
return `${parts.year}-${parts.month}-${parts.day}`;
}
