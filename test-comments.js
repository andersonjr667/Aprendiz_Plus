// Test script for comment system
const mongoose = require('mongoose');
const Comment = require('./models/Comment');
const User = require('./models/User');
const News = require('./models/News');
const Job = require('./models/Job');

async function testCommentSystem() {
  try {
    console.log('🧪 Testing Comment System...');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/aprendiz_plus');

    // Get test data
    const testUser = await User.findOne({ type: 'candidato' });
    const testNews = await News.findOne();
    const testJob = await Job.findOne();

    if (!testUser || (!testNews && !testJob)) {
      console.log('❌ Test data not found. Please ensure you have users, news, and jobs in the database.');
      return;
    }

    console.log('✅ Test data found');

    // Test creating a comment on news
    if (testNews) {
      console.log('📝 Testing comment creation on news...');

      const comment = await Comment.create({
        author: testUser._id,
        targetType: 'news',
        targetId: testNews._id,
        content: 'Este é um comentário de teste para uma notícia.',
        status: 'approved'
      });

      console.log('✅ Comment created:', comment._id);

      // Test replying to the comment
      const reply = await Comment.create({
        author: testUser._id,
        targetType: 'news',
        targetId: testNews._id,
        content: 'Esta é uma resposta ao comentário.',
        parentComment: comment._id,
        status: 'approved'
      });

      console.log('✅ Reply created:', reply._id);

      // Test liking the comment
      comment.likes.push({ user: testUser._id, likedAt: new Date() });
      comment.likesCount = 1;
      await comment.save();

      console.log('✅ Comment liked');

      // Test fetching comments
      const comments = await Comment.find({
        targetType: 'news',
        targetId: testNews._id,
        status: 'approved',
        parentComment: null
      })
      .populate('author', 'name')
      .populate('replies')
      .sort({ createdAt: -1 });

      console.log('✅ Comments fetched:', comments.length);

      // Clean up test data
      await Comment.deleteMany({ content: { $regex: 'teste|resposta' } });
      console.log('🧹 Test data cleaned up');
    }

    console.log('🎉 Comment system test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run test if called directly
if (require.main === module) {
  testCommentSystem();
}

module.exports = { testCommentSystem };