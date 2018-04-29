let fs = require('fs')
const _cliProgress = require('cli-progress')
const readlineSync = require('readline-sync');
let emojiRegex = /[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}\u{1f1e6}-\u{1f1ff}\u{1f191}-\u{1f251}\u{1f004}\u{1f0cf}\u{1f170}-\u{1f171}\u{1f17e}-\u{1f17f}\u{1f18e}\u{3030}\u{2b50}\u{2b55}\u{2934}-\u{2935}\u{2b05}-\u{2b07}\u{2b1b}-\u{2b1c}\u{3297}\u{3299}\u{303d}\u{00a9}\u{00ae}\u{2122}\u{23f3}\u{24c2}\u{23e9}-\u{23ef}\u{25b6}\u{23f8}-\u{23fa}]/ug
let monthsArray = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sept", "oct", "nov", "dec"]
let daysArray = ["mon", "tue", "wed", "thur", "fri", "sat", "sun"]
let json = []
let f = 0

fs.readdir("./input/", (err, files) => {
    for (let t = 0; t < files.length; t++) {
        if (files[t].endsWith('.json')) json.push(files[t])
    }
    if (json.length > 0)
        convertFile(json[f])
    else console.log("no files found")
})



function convertFile(file) {
    console.log("=================================\n" + file)
    inp = file.replace('.html', '')
    fs.readFile('./input/' + file, 'utf8', function (err, data) {
        if (err) throw err
        inp = file.split('.')[0]
        let messages = JSON.parse(data)
        analyze(messages.messages, inp, true)
    })
    f++
    if (f < json.length) {
        convertFile(json[f])
    }

}


//start analyzing chat
function analyze(chat, inp, isJSON) {
    let users = []
    let total = {
        wordCount: 0,
        messageCount: 0,
        photoShared: 0,
        stickers: [],
        wordsSaid: [],
        emojis: []
    }
    let mesPerPersonPerDayPerYear = []
    const bar = new _cliProgress.Bar({
        format: 'analyzing data: [{bar}] {percentage}%'
    }, _cliProgress.Presets.shades_classic)
    bar.start(chat.lenght, 0)
    //sort chronological
    chat.sort((a, b) => {
        return a.timestamp > b.timestamp ? 1 : -1
    })

    //go through every message and add data
    for (let i = 0; i < chat.length; i++) {
        let u = findUser(chat[i].sender_name)
        chat[i].timestamp *= 1000
        let time = new Date(chat[i].timestamp)
        let year = time.getFullYear()
        //add to messagecount
        total.messageCount += 1
        u.messageCount += 1

        //add byHour
        let hour = time.getHours()
        if (!u.byHour[hour])
            u.byHour[hour] = 0
        u.byHour[hour] += 1

        //add byDay
        let day = getDaybyNumber(time.getDay())
        if (!u.byDay[day])
            u.byDay[day] = 0
        u.byDay[day] += 1

        //add byMonth
        let month = getMonthbyNumber(time.getMonth())
        if (!u.byMonth[month])
            u.byMonth[month] = 0
        u.byMonth[month] += 1


        let isImage = false
        let mes = chat[i].content

        //images/stickers
        if (!isJSON) {
            if (mes.includes("stickers_used")) {
                isImage = true
                let stickerID = mes.split('/')[2].split('.')[0]
                findInArray(total.stickers, stickerID)
                findInArray(u.stickers, stickerID)
            }
            if (mes.includes("/photos/") || mes.includes("messages/gifs") || mes.includes("messages/videos") || mes.includes("messages/audio") || mes.includes("messages/file")) {
                u.photoShared += 1
                total.photoShared += 1
                isImage = true
            }
        } else {
            if (chat[i].photos || chat[i].gifs || chat[i].videos) {
                u.photoShared += 1
                total.photoShared += 1
                isImage = true
            }
            if (chat[i].sticker) {
                let stickerID = chat[i].sticker.uri.split('/')[2].split('.')[0]
                findInArray(total.stickers, stickerID)
                findInArray(u.stickers, stickerID)
                isImage = true
            }
        }
        //words
        if (!isImage && chat[i].content) {
            let words = mes.split(" ")
            for (let j = 0; j < words.length; j++) {
                if (words[j] != '' && words[j]) {
                    let isEmoji = false
                    if (words[j].match(emojiRegex)) {
                        findInArray(total.emojis, words[j])
                        findInArray(u.emojis, words[j])
                        isEmoji = true
                    }
                    if (!isEmoji) {
                        let word = words[j].toLowerCase().replace(/[^a-z0-9]/g, '')
                        if (word) {
                            total.wordCount += 1
                            u.wordCount += 1
                            findInArray(u.wordsSaid, word)
                            findInArray(total.wordsSaid, word)
                        }
                    }
                }
            }
        }
        let p = Math.round((i / chat.length) * 100)
        bar.update(p)
    }
    bar.stop()



    let firstMesDate = new Date(chat[0].timestamp)
    let lastMesDate = new Date(chat[chat.length - 1].timestamp)

    let today = new Date().getTime()
    let tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    let millisInDay = tomorrow.getTime() - today
    firstMesDate = new Date(firstMesDate.getFullYear(), firstMesDate.getMonth(), firstMesDate.getDate(), 2, 0, 1, 0)
    for (let i = firstMesDate.getTime(); i < lastMesDate.getTime(); i += millisInDay) {
        let thisDay = new Date(i)

        //obj from array of this day
        let mesObj = mesPerPersonPerDayPerYear.find(x => x.date == thisDay.getTime())
        if (!mesObj) {
            mesObj = {
                date: thisDay.getTime()
            }
            mesPerPersonPerDayPerYear.push(mesObj)
        }
        for (let p = 0; p < users.length; p++) {
            if (!mesObj[users[p].name]) {
                mesObj[users[p].name] = 0
            }
        }
        let messagesOnThisDay = chat.filter(x => x.timestamp > i && x.timestamp < (i + millisInDay))
        for (let j = 0; j < messagesOnThisDay.length; j++) {
            let u = messagesOnThisDay[j].sender_name
            mesObj[u] += 1
        }
    }
    //sort everything
    for (let i = 0; i < users.length; i++) {
        users[i].stickers.sort(sortOnCount)
        users[i].wordsSaid.sort(sortOnCount)
        users[i].emojis.sort(sortOnCount)
    }
    total.stickers.sort(sortOnCount)
    total.wordsSaid.sort(sortOnCount)
    total.emojis.sort(sortOnCount)

    //export to csv
    let stream = fs.createWriteStream("./output/" + inp + ".csv")
    stream.once('open', function (fd) {
        //total stats
        stream.write("total messages:;" + total.messageCount + ";\n")
        stream.write("total pictures:;" + total.photoShared + ";\n")
        stream.write("total words:;" + total.wordCount + ";\n")
        let tStickers = 0
        for (let s = 0; s < total.stickers.length; s++)
            tStickers += total.stickers[s].count
        stream.write("total stickers used:;" + tStickers + ";\n")

        //total stat per user
        let header = ";"
        let wordsLine = "words:;"
        let messagesLine = "messages:;"
        let picturesLine = "pictures:;"
        let stickersUsed = "stickers:;"
        for (let u = 0; u < users.length; u++) {
            header += users[u].name + ";"
            wordsLine += users[u].wordCount + ";"
            messagesLine += users[u].messageCount + ";"
            picturesLine += users[u].photoShared + ";"
            let sU = 0
            for (let s = 0; s < users[u].stickers.length; s++)
                sU += users[u].stickers[s].count
            stickersUsed += sU + ";"

        }
        stream.write(header + ";\n" + wordsLine + ";\n" + messagesLine + ";\n" + picturesLine + ";\n" + stickersUsed + ";\n")

        let userlines = []
        dateline = "date:;"
        for (let i = 0; i < mesPerPersonPerDayPerYear.length; i++) {
            let d = new Date(mesPerPersonPerDayPerYear[i].date)
            dateline += d.getDate() + " " + getMonthbyNumber(d.getMonth()) + "" + d.getFullYear() + ";"
            for (let p = 0; p < users.length; p++) {
                let uL = userlines.find(x => x.name === users[p].name)
                if (!uL) {
                    uL = {
                        name: users[p].name,
                        line: users[p].name + ";"
                    }
                    userlines.push(uL)

                }
                uL.line += mesPerPersonPerDayPerYear[i][users[p].name] + ";"
            }

        }
        let line = ""
        for (let l = 0; l < userlines.length; l++) {
            line += userlines[l].line + ";\n"
        }
        stream.write(dateline + "\n")
        stream.write(line)
        stream.write("\n\n")



        stream.write("users; ;per day;   ;   ;    ;   ;   ;   ; ;per month;   ;   ;   ;   ;   ;   ;   ;   ;   ;   ;   ; ;per hour; ; ; ; ; ; ; ; ; ; ; ; ;  ;  ;  ;  ;  ;  ;  ;  ;  ;  ;  ;  ;\n");
        let daysmonthsLine = "     ; ;mon    ;tue;wed;thur;fri;sat;sun; ;"
        for (let m = 0; m < monthsArray.length; m++)
            daysmonthsLine += monthsArray[m] + ";"
        daysmonthsLine += "; 0; 1; 2; 3; 4; 5; 6; 7; 8; 9; 10; 11; 12; 13; 14; 15; 16; 17; 18; 19; 20; 21; 22; 23 \n "
        stream.write(daysmonthsLine)

        stream.write("all time;\n")
        for (let u = 0; u < users.length; u++) {
            let us = users[u]
            let line = us.name + "; ;"

            for (let d = 0; d < 7; d++) {
                let number = us.byDay[getDaybyNumber(d)]
                if (!number) number = 0
                line += number + ";"
            }
            line += " ;"
            for (let m = 0; m < 12; m++) {
                let number = us.byMonth[getMonthbyNumber(m)]
                if (!number) number = 0
                line += number + ";"
            }
            line += " ;"
            for (let h = 0; h < 24; h++) {
                let number = us.byHour[h]
                if (!number) number = 0
                line += number + ";"
            }
            line += ";" + us.photoShared
            stream.write(line + "\n")
        }
        stream.write("\n\ntop15;\n ;words; ;stickers; ;emojis; ;\n")
        let top = ""
        for (let t = 0; t < 100; t++) {
            top += (t + 1) + ";"
            if (total.wordsSaid[t])
                top += total.wordsSaid[t].name + ";" + total.wordsSaid[t].count + ";"
            else top += "; ;"
            if (total.stickers[t])
                top += total.stickers[t].name + ";" + total.stickers[t].count + ";"
            else top += "; ;"
            if (total.emojis[t])
                top += total.emojis[t].name + ";" + total.emojis[t].count + ";"
            else top += "; ;"
            top += ";\n"
        }
        stream.write(top)


        stream.end()

    })
    console.log("Finished! find the data at /output/" + inp + ".csv")

    function findUser(name) {
        for (let i = 0; i < users.length; i++) {
            if (users[i].name === name) return users[i]
        }
        let newUser = {
            name: name,
            byHour: {},
            byMonth: {},
            byDay: {},
            wordCount: 0,
            messageCount: 0,
            stickers: [],
            photoShared: 0,
            wordsSaid: [],
            emojis: []
        }
        users.push(newUser)
        return newUser

    }
}

function searchMonthInString(string) {
    string = string.toLowerCase()
    for (let i = 0; i < monthsArray.length; i++) {
        if (string.includes(monthsArray[i])) return i
    }
}


//helper functions
function monthToNumber(month) {
    for (let i = 0; i < monthsArray.length; i++) {
        if (monthsArray[i] === month) return i
    }
}



function getDaybyNumber(day) {
    return monthsArray[day]
}

function getMonthbyNumber(month) {
    return monthsArray[month]
}

function sortOnCount(a, b) {
    return b.count - a.count
}

function findInArray(array, word) {
    let found = array.find(x => x.name === word)

    if (found) found.count += 1
    else {
        array.push({
            name: word,
            count: 1
        })
    }
}
