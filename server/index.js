'use strict';

const app  = require('./app');
const PORT = parseInt(process.env.PORT, 10) || 3001;

app.listen(PORT, () => console.log(`LCMS server running on http://localhost:${PORT}`));
