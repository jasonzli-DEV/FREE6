import { Router } from 'express';
import passport from 'passport';

export const authRouter = Router();

authRouter.get('/discord', passport.authenticate('discord'));

authRouter.get('/callback', passport.authenticate('discord', {
  failureRedirect: '/?error=auth_failed',
  successRedirect: '/dashboard',
}));

authRouter.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) console.error(err);
    res.redirect('/');
  });
});
