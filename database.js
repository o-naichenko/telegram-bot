const dotenv = require('dotenv');
dotenv.config();
const mongoose = require('mongoose');
const CONNECTIONSTRING = process.env.CONNECTIONSTRING;
const { Schema } = mongoose;

mongoose.connect(CONNECTIONSTRING, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const StuffSchema = new Schema({
  // caseNumber: Number,
  getDescr: Array,
  returnDescr: Array,
  getImagesId: Array,
  getPhotosUrl: Array,
  returnImagesId: Array,
  returnPhotosUrl: Array,
  takenDate: Date,
  returnDate: Date,
  userId: Number,
  userName: String,
  isReturned: Boolean,
});

const Stuff = mongoose.model('Stuff', StuffSchema);

const saveStuff = async (stuffInfo) => {
  const stuff = new Stuff(stuffInfo);
  await stuff.save();
  // console.log(`Saved stuff to the database: ${stuff}`);
  return stuff;
};

const getStuff = async () => {
  const stuff = await Stuff.find();
  // console.log(`Found stuff in the database: ${stuff}`);
  return stuff;
};

const getStuffByUserId = async (userId) => {
  const stuff = await Stuff.find({userId: userId});
  // console.log(stuff);
  return stuff;
}

const updateStuff = async (id, updateInfo) => {
  const stuff = await Stuff.findByIdAndUpdate(id, updateInfo, { new: true });
  // console.log(`Updated stuff in the database: ${stuff}`);
  return stuff;
};

module.exports = {
  saveStuff,
  getStuff,
  updateStuff,
  getStuffByUserId,
};
