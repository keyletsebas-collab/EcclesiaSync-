export const bibleVerses = [
    { text: "Todo lo puedo en Cristo que me fortalece.", reference: "Filipenses 4:13" },
    { text: "El Señor es mi pastor; nada me faltará.", reference: "Salmo 23:1" },
    { text: "Mira que te mando que te esfuerces y seas valiente; no temas ni desmayes, porque Jehová tu Dios estará contigo en dondequiera que vayas.", reference: "Josué 1:9" },
    { text: "Y sabemos que a los que aman a Dios, todas las cosas les ayudan a bien, esto es, a los que conforme a su propósito son llamados.", reference: "Romanos 8:28" },
    { text: "Fíate de Jehová de todo tu corazón, y no te apoyes en tu propia prudencia. Reconócelo en todos tus caminos, y él enderezará tus veredas.", reference: "Proverbios 3:5-6" },
    { text: "Pero los que esperan a Jehová tendrán nuevas fuerzas; levantarán alas como las águilas; correrán, y no se cansarán; caminarán, y no se fatigarán.", reference: "Isaías 40:31" },
    { text: "Dios es nuestro amparo y fortaleza, nuestro pronto auxilio en las tribulaciones.", reference: "Salmo 46:1" },
    { text: "Venid a mí todos los que estáis trabajados y cargados, y yo os haré descansar.", reference: "Mateo 11:28" },
    { text: "Porque yo sé los pensamientos que tengo acerca de vosotros, dice Jehová, pensamientos de paz, y no de mal, para daros el fin que esperáis.", reference: "Jeremías 29:11" },
    { text: "No temas, porque yo estoy contigo; no desmayes, porque yo soy tu Dios que te esfuerzo; siempre te ayudaré, siempre te sustentaré con la diestra de mi justicia.", reference: "Isaías 41:10" }
];

export const getRandomVerse = () => {
    const randomIndex = Math.floor(Math.random() * bibleVerses.length);
    return bibleVerses[randomIndex];
};
