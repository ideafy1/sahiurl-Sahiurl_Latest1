const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.redirect = functions.https.onRequest(async (req, res) => {
  try {
    const shortCode = req.query.code;
    
    if (!shortCode) {
      return res.status(400).send('Missing shortcode');
    }
    
    // Query Firestore for the link
    const linksRef = admin.firestore().collection('links');
    const snapshot = await linksRef.where('shortCode', '==', shortCode).limit(1).get();
    
    if (snapshot.empty) {
      return res.redirect('/404');
    }
    
    const linkData = snapshot.docs[0].data();
    const linkId = snapshot.docs[0].id;
    
    // Record analytics
    const clickData = {
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown',
      referer: req.headers.referer || 'direct',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Update analytics in the background
    admin.firestore().collection('clicks').add({
      linkId,
      ...clickData
    });
    
    // Update link analytics
    admin.firestore().doc(`links/${linkId}`).update({
      'analytics.clicks': admin.firestore.FieldValue.increment(1),
      'updatedAt': admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Check if we should use the monetization system
    if (linkData.settings?.adEnabled) {
      return res.redirect(`/go?code=${shortCode}`);
    }
    
    // Direct redirect if ads are disabled
    return res.redirect(linkData.originalUrl);
  } catch (error) {
    console.error('Error in redirect function:', error);
    return res.redirect('/error');
  }
}); 