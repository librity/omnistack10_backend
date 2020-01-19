const axios = require("axios");
const Dev = require("../models/Dev");
const parseStringAsArray = require("../utils/parseStringAsArray");
const { findConnections, sendMessage } = require("../websocket");

module.exports = {
  async index(request, response) {
    const devs = await Dev.find();

    return response.json(devs);
  },

  async store(request, response) {
    const { github_username, techs, latitude, longitude } = request.body;

    const devAlreadyExists = await Dev.findOne({ github_username });

    if (devAlreadyExists) {
      return response.json(devAlreadyExists);
    }

    const apiResponse = await axios.get(
      `https://api.github.com/users/${github_username}`
    );

    const { name = login, avatar_url, bio } = apiResponse.data;

    const techsArray = parseStringAsArray(techs);

    const location = {
      type: "Point",
      coordinates: [longitude, latitude]
    };

    const dev = await Dev.create({
      github_username,
      name,
      avatar_url,
      bio,
      techs: techsArray,
      location
    });

    const sendSocketMessageTo = findConnections(
      { latitude, longitude },
      techsArray
    );

    sendMessage(sendSocketMessageTo, "new-dev", dev);

    return response.json(dev);
  },

  async update(request, response) {
    const { id } = request.params;

    const dev = await Dev.findById(id);

    if (!dev) {
      return response.status(404).json({ error: "Dev not found" });
    }

    const {
      name = dev.name,
      avatar_url = dev.avatar_url,
      bio = dev.bio,
      latitude = dev.location.coordinates[1],
      longitude = dev.location.coordinates[0]
    } = request.body;

    let { techs } = request.body;
    let techsArray;

    if (!techs) {
      techsArray = dev.techs;
    } else {
      techsArray = parseStringAsArray(techs);
    }

    const location = {
      type: "Point",
      coordinates: [longitude, latitude]
    };

    await dev.update({
      name,
      avatar_url,
      bio,
      techs: techsArray,
      location
    });

    return response.json(dev);
  },

  async destroy(request, response) {
    const { id } = request.params;

    const dev = await Dev.findByIdAndDelete(id);

    return response.json(dev);
  }
};
