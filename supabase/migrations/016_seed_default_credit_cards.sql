-- Seed default credit cards (with plans) for all existing users
-- Only inserts cards that don't already exist (by name) for each user
DO $$
DECLARE
  _uid uuid;
  _card_id uuid;
BEGIN
  FOR _uid IN SELECT id FROM public.profiles
  LOOP

    -- 1. 台新 Richart (with plans)
    IF NOT EXISTS (SELECT 1 FROM public.credit_cards WHERE user_id = _uid AND name = '台新 Richart') THEN
      INSERT INTO public.credit_cards (user_id, name, cashback_rate, cashback_limit)
      VALUES (_uid, '台新 Richart', 0, 300000)
      RETURNING id INTO _card_id;

      INSERT INTO public.credit_card_plans (credit_card_id, name, cashback_rate) VALUES
        (_card_id, 'Pay著刷', 3.8),
        (_card_id, '天天刷',  3.3),
        (_card_id, '大筆刷',  3.3),
        (_card_id, '好饗刷',  3.3),
        (_card_id, '數趣刷',  3.3),
        (_card_id, '玩旅刷',  3.3),
        (_card_id, '假日刷',  2);
    END IF;

    -- 2. 國泰 Cube (with plans)
    IF NOT EXISTS (SELECT 1 FROM public.credit_cards WHERE user_id = _uid AND name = '國泰 Cube') THEN
      INSERT INTO public.credit_cards (user_id, name, cashback_rate, cashback_limit)
      VALUES (_uid, '國泰 Cube', 0, 300000)
      RETURNING id INTO _card_id;

      INSERT INTO public.credit_card_plans (credit_card_id, name, cashback_rate) VALUES
        (_card_id, '玩數位',  3),
        (_card_id, '樂饗購',  3),
        (_card_id, '趣旅行',  3),
        (_card_id, '集精選',  2),
        (_card_id, '慶生月', 10);
    END IF;

    -- 3. 玉山 熊本熊
    IF NOT EXISTS (SELECT 1 FROM public.credit_cards WHERE user_id = _uid AND name = '玉山 熊本熊') THEN
      INSERT INTO public.credit_cards (user_id, name, cashback_rate, cashback_limit)
      VALUES (_uid, '玉山 熊本熊', 8.5, 8333);
    END IF;

  END LOOP;
END $$;
