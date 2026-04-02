import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  const cwd = process.cwd();
  
  const searchPaths = [
    path.join(cwd, 'public', 'local.db'),
    path.join(cwd, 'local.db'),
    path.join(cwd, 'data', 'local.db'),
    path.join(cwd, '.next', 'server', 'chunks', 'public', 'local.db'),
    path.join(cwd, '.next', 'server', 'public', 'local.db'),
    // Also check standard Vercel paths
    '/var/task/public/local.db',
    '/var/task/local.db'
  ];

  const results = searchPaths.map(p => ({
    path: p,
    exists: fs.existsSync(p),
    size: fs.existsSync(p) ? fs.statSync(p).size : 0
  }));

  // List files in current directory
  let files: string[] = [];
  try {
    files = fs.readdirSync(cwd);
  } catch (e) {
    files = ['error reading dir'];
  }

  // Also check public dir if it exists
  let publicFiles: string[] = [];
  try {
    publicFiles = fs.readdirSync(path.join(cwd, 'public'));
  } catch (e) {
    publicFiles = ['public dir not found'];
  }

  return NextResponse.json({
    cwd,
    node_env: process.env.NODE_ENV,
    results,
    files,
    publicFiles
  });
}
