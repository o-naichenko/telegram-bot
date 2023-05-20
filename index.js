const dotenv = require('dotenv');
dotenv.config();
const { Telegraf, Markup } = require('telegraf');
const TelegrafCalendar = require('telegraf-calendar-telegram');
const mongoose = require('mongoose');
const { saveStuff, updateStuff, getStuffByUserId } = require('./database.js');

const TOKEN = process.env.TOKEN;
const ADMIN = process.env.ADMIN;
const CONNECTIONSTRING = process.env.CONNECTIONSTRING;
try {
  mongoose.connect(CONNECTIONSTRING, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
} catch (error) {
  console.log(error);
}

const bot = new Telegraf(TOKEN);

let collectGetInfo = false;
let collectReturnInfo = false;

let userCases = [];
let caseToReturnId = 0;
let caseInfo = {
  getDescr: [],
  returnDescr: [],
  getImagesId: [],
  getPhotosUrl: [],
  returnImagesId: [],
  returnPhotosUrl: [],
  takenDate: new Date(),
  returnDate: '',
  userId: null,
  userName: '',
  isReturned: false,
};
function resetCaseInfo() {
 const defaultCaseInfo = {
      getDescr: [],
      returnDescr: [],
      getImagesId: [],
      getPhotosUrl: [],
      returnImagesId: [],
      returnPhotosUrl: [],
      takenDate: new Date(),
      returnDate: '',
      userId: null,
      userName: '',
      isReturned: false,
  };
  caseInfo = defaultCaseInfo;  
}

//МЕНЮ

const MenuBtns = {
  getStuff: 'Взяти',
  returnStuff: 'Повернути',
  contactAdmin: "Зв'язок з адміністратором",
  back: 'Назад',
  forward: 'Вперед',
  confirm: 'Підтвердити'
};

const mainMenu = {
  reply_markup: {
    keyboard: [
      [MenuBtns.getStuff, MenuBtns.returnStuff],
      [MenuBtns.contactAdmin],
    ],
    resize_keyboard: true,
  },
};
const addInfoMenu = {
  reply_markup: {
    keyboard: [[MenuBtns.back, MenuBtns.forward]],
    // resize_keyboard: true,
  },
};
const confirmMenu = {
  reply_markup: {
    keyboard: [[MenuBtns.back, MenuBtns.confirm]],
    resize_keyboard:true,
  }
}
const backMenu = {
  reply_markup: { 
  keyboard: [[MenuBtns.back]] },
  // resize_keyboard: true,
};

// КАЛЕНДАР

const calendar = new TelegrafCalendar(bot, {
  startWeekDay: 1,
  weekDayNames: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'],
  monthNames: [
      'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень', 'Липень',
      'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
  ],
  todayHighlight: true,
  today: new Date() // додаємо параметр today,
});

async function showCalendar(ctx) {
  const today = new Date();
  const minDate = new Date();
  minDate.setMonth(today.getMonth());
  const maxDate = new Date();
  maxDate.setMonth(today.getMonth() + 2);
  maxDate.setDate(today.getDate());

  await ctx.reply(
    'Обери дату повернення',
    calendar.setMinDate(minDate).setMaxDate(maxDate).getCalendar()
  );

};

async function getUserCases(userId) {
  try {
    userCases = await getStuffByUserId(userId) || [];
  } catch (error) {
    console.log(error);
  }
}

// БОТ СТАРТ

bot.command('start', async (ctx) => {

    const userName = ctx.from.first_name;
    caseInfo.userName = userName;
    await ctx.reply(`${userName}, обери пункт меню`, mainMenu);

});
  
bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    caseInfo.userId = ctx.message.from.id;
    caseInfo.userName = ctx.message.from.username;

    switch (text) {
  // ВЗЯТИ
      case MenuBtns.getStuff:
        currentMenuMessage = await ctx.reply('Прошу, опиши що береш, та / або додай фото', backMenu);
      
        collectGetInfo = true;     
        break;

  // ПОВЕРНУТИ

      case MenuBtns.returnStuff:
        // Бот отримує з бази даних угоди юзера
        await getUserCases(caseInfo.userId);

        const notReturnedCases = userCases.filter(userCase => !userCase.isReturned);
        if (notReturnedCases.length === 0){
          await ctx.reply('В моїй базі відсутня інформація за твоїм акаунтом');
          return;
        }

        await ctx.reply('Обери угоду для повернення', backMenu);

        for (const notReturnedCase of notReturnedCases) {
          const description = notReturnedCase.getDescr.length > 0 ? notReturnedCase.getDescr.join('\n') : 'Угода без опису';
          const caseId = notReturnedCase.id;
          const photos = notReturnedCase.getImagesId;

          if (photos.length === 0) {
            return;
          } else if (photos.length === 1) {
            for (const photo of photos) {
              await ctx.replyWithPhoto(photo);
            }
          } else if (photos. length > 1) {
            const media = photos.map(photo => ({
              type: 'photo',
              media: photo
            })); 
            await ctx.replyWithMediaGroup(media);
          };
          ctx.reply(`${description}`, {
            reply_markup: {
              inline_keyboard: [
                [{ text: 'Повернути', callback_data: caseId }]
              ]
            }, backMenu
          });
          console.log(`caseId${caseId}`);

          bot.on('callback_query', async (ctx) => {
            const callbackData = ctx.callbackQuery.data;
            caseToReturnId = callbackData;
            caseInfo = notReturnedCases.find(notReturnedCase => notReturnedCase.id === caseToReturnId);
            
            await ctx.reply('Прошу, напиши чи все в порядку та / або додай фото', backMenu);
            collectReturnInfo = true;
            // caseInfo.returnDate = new Date().toLocaleDateString('uk-UA');

          });
        }
        // // collectCaseInfo = true;
        break;

  // НАЗАД

      case MenuBtns.back:
        await ctx.reply('Обери пункт меню', mainMenu);
        collectGetInfo = false;
        collectReturnInfo = false;

        break;

  // ВПЕРЕД

      case MenuBtns.forward:
       if (caseInfo.getDescr.length > 0 || caseInfo.getImagesId.length > 0) {
        showCalendar(ctx);
        calendar.setDateListener(async (ctx, date) => {
          await ctx.reply(`Дата повернення: ${date}`, confirmMenu)
          caseInfo.returnDate = date;
        })} else {
          await ctx.reply('Прошу, опишіть що берете, також можна додати фото');
        }
        break;

  // КОНТАКТ АДМІНА

      case MenuBtns.contactAdmin:
        await ctx.reply(`Прошу писати і телефонувати ${ADMIN}`);
        break;

  // ПІДТВЕРДИТИ

      case MenuBtns.confirm:

       if (collectGetInfo) {
          saveStuff(caseInfo);
          await ctx.reply('Спасибі, бережи себе і речі, до зустрічі).', mainMenu);
          // Скидаємо змінні для збору наступної інформації
          
          resetCaseInfo();
        };
        if (collectReturnInfo) {
          try {
            caseInfo.isReturned = true;
            await updateStuff(caseToReturnId, caseInfo);
            ctx.reply('Спасибі, бережи себе, до зустрічі).', mainMenu);
          } catch (error) {
            console.log(error);
          }
                   
        }
        collectGetInfo = false;
        collectReturnInfo = false;       
        resetCaseInfo();
          

        break;
    }

    if (Object.values(MenuBtns).includes(ctx.message.text)) {
      return;
    }
    if (ctx.message.text && collectGetInfo ) {
      caseInfo.getDescr.push(ctx.message.text);
    } else if (ctx.message.text && collectReturnInfo);
    caseInfo.returnDescr.push(ctx.message.text);

    if (collectGetInfo) {
      if(caseInfo.getDescr.length > 0 || caseInfo.getImagesId.length > 0) {
        await ctx.reply('Додай більше інформації або тисни Вперед для продовження', addInfoMenu);
      };
    };
    if (collectReturnInfo) {
      if(caseInfo.returnDescr.length > 0 || caseInfo.returnImagesId > 0) {
      await ctx.reply('Додай більше інформації або тисни Підтвердити для продовження', confirmMenu);
      };
    };
});

// ФОТО

  bot.on('photo', async (ctx) => {
    if(collectGetInfo === collectReturnInfo) {
      ctx.reply('Спершу обери пункт меню');
      return;
    }    

    const photos = ctx.message.photo;
    const largePhoto = photos[photos.length - 1];
    const photoDescr = ctx.message.caption;
    const photoInfo = await ctx.telegram.getFile(largePhoto.file_id);
    const photoUrl = `https://api.telegram.org/file/bot${TOKEN}/${photoInfo.file_path}`;

    if (collectGetInfo) {
      photoDescr ? caseInfo.getDescr.push(photoDescr): null;
      caseInfo.getImagesId.push(largePhoto.file_id);
      caseInfo.getPhotosUrl.push(photoUrl);
      await ctx.reply('Додай більше інформації або тисни Вперед для продовження', addInfoMenu);
    } else if (collectReturnInfo) {
      photoDescr ? caseInfo.returnDescr.push(photoDescr): null;
      caseInfo.returnImagesId.push(largePhoto.file_id);
      caseInfo.returnPhotosUrl.push(photoUrl);
      await ctx.reply('Додай більше інформації або тисни Підтвердити для продовження', confirmMenu);
    }

  });



  bot.launch();

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));


  