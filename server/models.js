const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// SQLite database in project root
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../database.sqlite'),
  logging: false
});

const User = sequelize.define('User', {
  username: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('operator', 'administrator'), allowNull: false }
});

const Zone = sequelize.define('Zone', {
  name: { type: DataTypes.STRING, allowNull: false },
  location: { type: DataTypes.STRING },
  vendor: { type: DataTypes.STRING },
  squareFeet: { type: DataTypes.INTEGER },
  tons: { type: DataTypes.INTEGER },
});

const Generator = sequelize.define('Generator', {
  name: { type: DataTypes.STRING, allowNull: false },
  kva: { type: DataTypes.INTEGER },
  status: { type: DataTypes.ENUM('running', 'offline'), defaultValue: 'offline' },
  lastOperator: { type: DataTypes.INTEGER },
});

const Log = sequelize.define('Log', {
  generatorName: { type: DataTypes.STRING },
  zoneName: { type: DataTypes.STRING },
  operatorName: { type: DataTypes.STRING },
  action: { type: DataTypes.ENUM('start', 'stop') },
  timestamp: { type: DataTypes.DATE },
  location: { type: DataTypes.STRING },
  status: { type: DataTypes.ENUM('running', 'offline') }
});

// Associations
Zone.belongsTo(User, { as: 'assignedOperator', foreignKey: { name: 'assignedOperatorId', allowNull: true } });
Generator.belongsTo(Zone);
Generator.belongsTo(User, { as: 'lastOperatorUser', foreignKey: { name: 'lastOperator', allowNull: true } });
Log.belongsTo(Generator);
Log.belongsTo(Zone);
Log.belongsTo(User, { as: 'operator', foreignKey: { name: 'operatorId', allowNull: true } });

module.exports = { sequelize, User, Zone, Generator, Log }; 