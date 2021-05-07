const colors = require('colors');
const Limiter = require('async-limiter');
const DEFAULT_TIMEOUT = 1000 * 1 * 2 // 1 minute
const CONCURRENCY_LIMIT = 4;
const MAX_PARAGRAPH_RETRIES = 3;
const paragraphConcurrentQueue = new Limiter({ concurrency: CONCURRENCY_LIMIT });
const bookConcurrentQueue = new Limiter({ concurrency: 1 });

const getBoolean = (id) => id === 3
const isSpeechLess = () => Math.random() < 0.5
const failedQueueRetries = {}

let activeBookParagraphsResponse = []
const dumpSpeechGenerator = async (id, TIMEOUT = DEFAULT_TIMEOUT) => {
    const isFailed = getBoolean(id)
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if(isFailed) {
                reject(`Book with id: ${id} the speech Has Been Failed`)
                return false;
            }

            resolve(`Paragraph with id ${id} has successfully created speech`)
        }, TIMEOUT)
    })
}

const paragraphQueueCB = (id, done) => (err, speech) => {
    if(err) {
        console.error(colors.red(err))
        retryParagraph(id, done)
    } else {
        if(isSpeechLess()) {
            retryParagraph(id, done)
        } else {
            activeBookParagraphsResponse.push({ [id]: true })
            done();
            console.log(colors.green(`speech has been done ${speech}`))
        }
    }
}

const retryParagraph = (id, cb) => {
    const retried = failedQueueRetries[id] || 1;
    if (retried === MAX_PARAGRAPH_RETRIES) {
        activeBookParagraphsResponse.push({ [id]: false })
        console.error(colors.red(`Paragraph with id ${id} has failed with all retries`))
        cb()
    } else {
        failedQueueRetries[id] = retried + 1;
        console.log(colors.yellow(`Paragraph restart id:${id}`))
        paragraphConcurrentQueue.unshift((done) => {
            paragraphQueue(id, paragraphQueueCB(id, done))
        })
        cb()
    }
}

const paragraphQueue = (paragraphId, cb) => {
    console.log(colors.yellow(`Paragraph start id:${paragraphId}`))
    dumpSpeechGenerator(paragraphId).then((data) => cb(null, data)).catch(cb)
}

const bookQueue = (book, cb) => {
    console.log(colors.rainbow(`---------------------`))
    console.log(colors.yellow(`Book start id:${book.id}`))
    book.paragraphs.forEach((id) => {
        paragraphConcurrentQueue.push((done) => {
            paragraphQueue(id, paragraphQueueCB(id, done))
        })

        paragraphConcurrentQueue.onDone(() => {
            cb(activeBookParagraphsResponse)
            activeBookParagraphsResponse = []
        })
    })
}


const setBooksInQueue = books => {
    books.forEach((book) =>  bookConcurrentQueue.push((done) => bookQueue(book, (paragraphs) => {
        console.log(paragraphs)
        done()
    })))
}

setBooksInQueue([
        {
            id: 1,
            paragraphs: [1,2,3,4,5,6]
        },
        {
            id: 2,
            paragraphs: [1,2,3,4]
        },
        {
            id: 1,
            paragraphs: [1,2,3,4,5,6,7,8,9]
        },
    ]
)