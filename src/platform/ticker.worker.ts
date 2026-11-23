/* Los navegadores frenan los temporizadores de una página oculta, pero no los de
   un worker. El worker solo marca el paso: la hora la pone siempre `endsAt`. */
setInterval(() => postMessage(0), 250);
