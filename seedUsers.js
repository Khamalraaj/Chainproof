const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected');

    // Remove existing users to avoid duplicates
    await User.deleteMany({ email: { $in: ['manager@test.com', 'mediator@test.com'] } });

    // Create default users
    await User.create([
      {
        name: 'Warehouse Manager',
        email: 'manager@test.com',
        password: 'password123',
        role: 'manager',
        phone: '+1234567890'
      },
      {
        name: 'Transport Mediator',
        email: 'mediator@test.com',
        password: 'password123',
        role: 'mediator',
        phone: '+0987654321'
      }
    ]);

    console.log('Test users created successfully!');
    process.exit();
  } catch (err) {
    console.error('Error seeding users:', err);
    process.exit(1);
  }
};

seed();
