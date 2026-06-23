const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// PostgreSQL 接続プールの設定
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// データベース接続テスト
pool.connect((err, client, release) => {
  if (err) {
    return console.error('【DB接続エラー】接続に失敗しました:', err.stack);
  }
  console.log('【DB接続成功】PostgreSQLに正常に接続されました。');
  release();
});

// ミドルウェア設定
app.use(cors()); // 異なるポート（React等）からの通信を許可
app.use(express.json()); // リクエストボディのJSONを解析

// テスト用：同じフォルダにある index.html を静的ファイルとして配信
app.use(express.static(__dirname));

/**
 * 1. センサーデータ一覧取得 (GET)
 * 役割: データベースからすべてのセンサーデータを取得して最新順に返す
 */
app.get('/api/sensors', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sensor_data ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/sensors エラー:', err);
    res.status(500).json({ error: 'サーバー内部でエラーが発生しました。' });
  }
});

/**
 * 2. センサーデータ追加 (POST)
 * 役割: フロントエンドから送信されたセンサーデータをDBに保存する
 */
app.post('/api/sensors', async (req, res) => {
  const { id, location, water_level } = req.body;

  // バリデーション（簡易的な値チェック）
  if (!id || !location || water_level === undefined) {
    return res.status(400).json({ error: '必要なフィールド（id, location, water_level）が不足しています。' });
  }

  try {
    const queryText = 'INSERT INTO sensor_data (device_id, location, water_level) VALUES ($1, $2, $3) RETURNING *';
    const values = [id, location, water_level];
    
    const result = await pool.query(queryText, values);
    
    // 保存されたデータをステータス201(Created)で返す
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /api/sensors エラー:', err);
    res.status(500).json({ error: 'サーバー内部でエラーが発生しました。' });
  }
});

/**
 * 3. 危険度データ一覧取得 (GET)
 * 役割: データベースからすべての危険度データを取得して最新順に返す
 */
app.get('/api/risk-level', async (req, res) => {
  try {
    // ※テーブル名が risk_levels であることを前提としています
    const result = await pool.query('SELECT * FROM risk_levels ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/risk-level エラー:', err);
    res.status(500).json({ error: 'サーバー内部でエラーが発生しました。' });
  }
});

/**
 * 4. 危険度データ追加 (POST)
 * 役割: フロントエンドから送信された危険度データをDBに保存する
 */
app.post('/api/risk-level', async (req, res) => {
  const { source, type } = req.body;

  // バリデーション
  if (!source || !type) {
    return res.status(400).json({ error: '必要なフィールド（source, type）が不足しています。' });
  }

  try {
    const queryText = 'INSERT INTO risk_levels (source, type) VALUES ($1, $2) RETURNING *';
    const values = [source, type];
    
    const result = await pool.query(queryText, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /api/risk-level エラー:', err);
    res.status(500).json({ error: 'サーバー内部でエラーが発生しました。' });
  }
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`  Server is running on http://localhost:${PORT}`);
  console.log(`  テスト画面: http://localhost:${PORT}/index.html`);
  console.log(`==================================================`);
});