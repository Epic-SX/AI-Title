'use client';

import { 
  Paper, 
  Typography, 
  Box, 
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';

interface MeasurementsCardProps {
  measurements: Record<string, number>;
}

export default function MeasurementsCard({ measurements }: MeasurementsCardProps) {
  const hasMeasurements = Object.keys(measurements).length > 0;

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        商品採寸結果
      </Typography>
      
      {hasMeasurements ? (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><Typography variant="subtitle2">項目</Typography></TableCell>
                <TableCell align="right"><Typography variant="subtitle2">サイズ (cm)</Typography></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(measurements).map(([key, value]) => {
                const displayName = {
                  'length': '長さ',
                  'width': '幅',
                  'height': '高さ',
                  'sleeve': '袖丈',
                  'shoulder': '肩幅',
                  'bust': '胸囲',
                  'waist': 'ウエスト',
                  'hip': 'ヒップ',
                  'inseam': '股下',
                  'outseam': '股上'
                }[key] || key;

                return (
                  <TableRow key={key}>
                    <TableCell component="th" scope="row">
                      {displayName}
                    </TableCell>
                    <TableCell align="right">{value}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <Typography color="text.secondary">
            採寸データが検出されませんでした
          </Typography>
        </Box>
      )}
      
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
        ※ 採寸データはAIによる自動検出のため、誤差がある場合があります。最終的な値は必ず手動で確認してください。
      </Typography>
    </Paper>
  );
} 